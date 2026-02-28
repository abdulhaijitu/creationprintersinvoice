import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { isPast, isToday, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

export interface Payment {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  organization_id: string | null;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    due_date: string | null;
    customers: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface PaymentStats {
  totalReceivedThisMonth: number;
  pendingDue: number;
  overdueAmount: number;
  todayCollections: number;
}

export function usePayments() {
  const { organization } = useOrganization();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalReceivedThisMonth: 0,
    pendingDue: 0,
    overdueAmount: 0,
    todayCollections: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Fetch payments with invoice and customer details
      const { data, error } = await supabase
        .from('invoice_payments')
        .select(`
          id,
          invoice_id,
          payment_date,
          amount,
          payment_method,
          reference,
          notes,
          created_at,
          created_by,
          organization_id,
          invoice:invoices(
            id,
            invoice_number,
            total,
            paid_amount,
            due_date,
            customers(id, name)
          )
        `)
        .eq('organization_id', organization.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Transform data to match Payment interface
      const transformedPayments: Payment[] = (data || []).map((p: any) => ({
        ...p,
        invoice: p.invoice ? {
          ...p.invoice,
          customers: p.invoice.customers || null,
        } : null,
      }));

      setPayments(transformedPayments);

      // Calculate stats
      await calculateStats(transformedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const calculateStats = (paymentData: Payment[]) => {
    if (!organization?.id) return;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const todayStr = format(now, 'yyyy-MM-dd');

    // Total received this month
    const totalReceivedThisMonth = paymentData
      .filter(p => {
        const paymentDate = parseISO(p.payment_date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Today's collections
    const todayCollections = paymentData
      .filter(p => p.payment_date === todayStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate pending due and overdue from already-fetched invoice data (no extra query)
    const seenInvoices = new Map<string, { total: number; paid_amount: number; due_date: string | null }>();
    for (const p of paymentData) {
      if (p.invoice && !seenInvoices.has(p.invoice.id)) {
        seenInvoices.set(p.invoice.id, {
          total: Number(p.invoice.total),
          paid_amount: Number(p.invoice.paid_amount || 0),
          due_date: p.invoice.due_date,
        });
      }
    }

    let pendingDue = 0;
    let overdueAmount = 0;

    seenInvoices.forEach((inv) => {
      const due = inv.total - inv.paid_amount;
      if (due > 0) {
        pendingDue += due;
        if (inv.due_date && isPast(parseISO(inv.due_date)) && !isToday(parseISO(inv.due_date))) {
          overdueAmount += due;
        }
      }
    });

    setStats({
      totalReceivedThisMonth,
      pendingDue,
      overdueAmount,
      todayCollections,
    });
  };

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    stats,
    loading,
    refetch: fetchPayments,
  };
}
