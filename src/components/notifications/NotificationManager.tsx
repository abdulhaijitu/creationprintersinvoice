import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { differenceInDays, differenceInHours, parseISO, isToday, addDays } from 'date-fns';

export const NotificationManager = () => {
  const { user } = useAuth();
  const { showNotification, isSubscribed, permission } = usePushNotifications();
  const notifiedInvoices = useRef<Set<string>>(new Set());
  const notifiedTasks = useRef<Set<string>>(new Set());
  const notifiedLeaves = useRef<Set<string>>(new Set());
  const notifiedQuotations = useRef<Set<string>>(new Set());
  const slaCheckDone = useRef(false);
  const quotationExpiryCheckDone = useRef(false);

  // Trigger SLA/overdue check on app load (once per session)
  useEffect(() => {
    if (!user || slaCheckDone.current) return;

    const triggerSlaCheck = async () => {
      try {
        // Call the edge function to check for overdue tasks and SLA breaches
        const { error } = await supabase.functions.invoke('check-overdue-tasks');
        if (error) {
          console.warn('[NotificationManager] SLA check failed:', error);
        } else {
          console.log('[NotificationManager] SLA check triggered successfully');
        }
        slaCheckDone.current = true;
      } catch (err) {
        console.warn('[NotificationManager] Failed to trigger SLA check:', err);
      }
    };

    // Delay the check slightly to not block app startup
    const timeout = setTimeout(triggerSlaCheck, 3000);
    return () => clearTimeout(timeout);
  }, [user]);

  // Check for quotations about to expire (once per session)
  useEffect(() => {
    if (!user || quotationExpiryCheckDone.current) return;

    const checkExpiringQuotations = async () => {
      try {
        // Fetch quotations that are expiring in the next 3 days
        const threeDaysFromNow = addDays(new Date(), 3);
        
        const { data: quotations } = await supabase
          .from('quotations')
          .select('id, quotation_number, valid_until, total, status, customers(name, email)')
          .in('status', ['draft', 'sent'])
          .not('valid_until', 'is', null)
          .lte('valid_until', threeDaysFromNow.toISOString().split('T')[0])
          .gte('valid_until', new Date().toISOString().split('T')[0]);

        if (!quotations || quotations.length === 0) {
          quotationExpiryCheckDone.current = true;
          return;
        }

        // Send email notifications for quotations expiring soon
        for (const quotation of quotations) {
          if (notifiedQuotations.current.has(quotation.id)) continue;
          
          const customer = quotation.customers as any;
          if (!customer?.email) continue;

          // Send expiring soon email
          await supabase.functions.invoke('send-quotation-email', {
            body: {
              quotation_id: quotation.id,
              email_type: 'expiring_soon',
            },
          });

          notifiedQuotations.current.add(quotation.id);
          console.log(`[NotificationManager] Sent expiry reminder for quotation ${quotation.quotation_number}`);
        }

        quotationExpiryCheckDone.current = true;
      } catch (err) {
        console.warn('[NotificationManager] Failed to check expiring quotations:', err);
      }
    };

    // Delay the check to not block app startup
    const timeout = setTimeout(checkExpiringQuotations, 5000);
    return () => clearTimeout(timeout);
  }, [user]);

  // Check for invoice reminders
  useEffect(() => {
    if (!user || !isSubscribed || permission !== 'granted') return;

    const checkInvoiceReminders = async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, due_date, total, status, customers(name)')
        .or('status.eq.unpaid,status.eq.partial')
        .not('due_date', 'is', null);

      if (!invoices) return;

      const today = new Date();

      for (const invoice of invoices) {
        if (notifiedInvoices.current.has(invoice.id)) continue;
        
        const dueDate = parseISO(invoice.due_date!);
        const daysUntilDue = differenceInDays(dueDate, today);

        // Notify for overdue or due within 3 days
        if (daysUntilDue <= 3 && daysUntilDue >= -7) {
          let message = '';
          if (daysUntilDue < 0) {
            message = `Invoice ${invoice.invoice_number} is ${Math.abs(daysUntilDue)} days overdue`;
          } else if (daysUntilDue === 0) {
            message = `Invoice ${invoice.invoice_number} is due today`;
          } else {
            message = `Invoice ${invoice.invoice_number} is due in ${daysUntilDue} days`;
          }

          showNotification('Invoice Reminder', {
            body: `${message}\nCustomer: ${(invoice.customers as any)?.name || 'Unknown'}\nAmount: ৳${invoice.total?.toLocaleString('en-BD')}`,
            tag: `invoice-${invoice.id}`,
            requireInteraction: daysUntilDue <= 0,
          });

          notifiedInvoices.current.add(invoice.id);
        }
      }
    };

    // Check immediately and then every hour
    checkInvoiceReminders();
    const interval = setInterval(checkInvoiceReminders, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, isSubscribed, permission, showNotification]);

  // Check for task deadlines
  useEffect(() => {
    if (!user || !isSubscribed || permission !== 'granted') return;

    const checkTaskDeadlines = async () => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, deadline, priority, status')
        .not('deadline', 'is', null)
        .not('status', 'in', '("completed","delivered")');

      if (!tasks) return;

      const now = new Date();

      for (const task of tasks) {
        if (notifiedTasks.current.has(task.id)) continue;

        const deadline = parseISO(task.deadline!);
        const hoursUntilDeadline = differenceInHours(deadline, now);

        // Notify if due within 24 hours
        if (hoursUntilDeadline <= 24 && hoursUntilDeadline >= -48) {
          let message = '';
          if (hoursUntilDeadline < 0) {
            message = `Task "${task.title}" is overdue`;
          } else if (hoursUntilDeadline <= 2) {
            message = `Task "${task.title}" is due very soon`;
          } else if (isToday(deadline)) {
            message = `Task "${task.title}" is due today`;
          } else {
            message = `Task "${task.title}" is due tomorrow`;
          }

          showNotification('Task Deadline', {
            body: message,
            tag: `task-${task.id}`,
            requireInteraction: hoursUntilDeadline <= 2,
          });

          notifiedTasks.current.add(task.id);
        }
      }
    };

    checkTaskDeadlines();
    const interval = setInterval(checkTaskDeadlines, 30 * 60 * 1000); // Every 30 mins

    return () => clearInterval(interval);
  }, [user, isSubscribed, permission, showNotification]);

  // Listen for leave approval changes
  useEffect(() => {
    if (!user || !isSubscribed || permission !== 'granted') return;

    const channel = supabase
      .channel('leave-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old?.status;

          if (newStatus !== oldStatus && (newStatus === 'approved' || newStatus === 'rejected')) {
            const title = newStatus === 'approved' ? 'Leave Approved' : 'Leave Rejected';
            const body = newStatus === 'approved'
              ? 'Your leave request has been approved!'
              : `Your leave request was rejected. ${payload.new.rejection_reason || ''}`;

            showNotification(title, {
              body,
              tag: `leave-${payload.new.id}`,
              requireInteraction: true,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSubscribed, permission, showNotification]);

  return null; // This is a manager component, no UI
};
