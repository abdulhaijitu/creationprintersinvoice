import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationLog {
  organization_id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  subject?: string;
  body: string;
  status: string;
  metadata?: Record<string, unknown>;
}

interface ScheduledReminder {
  id: string;
  organization_id: string;
  notification_type: string;
  scheduled_for: string;
  reference_id?: string;
  reference_type?: string;
  metadata?: Record<string, unknown>;
}

interface OrganizationData {
  id: string;
  name: string;
  owner_email?: string;
  owner_id?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Render template with variables
function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

// Get organization data for notification variables
async function getOrganizationData(orgId: string): Promise<OrganizationData | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, owner_email, owner_id')
    .eq('id', orgId)
    .single();
  
  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
  
  return data;
}

// Check if notification channel is enabled for organization
async function isChannelEnabled(orgId: string, channel: string): Promise<boolean> {
  // Check global setting first
  const { data: globalSetting } = await supabase
    .from('global_notification_settings')
    .select('is_enabled')
    .eq('channel', channel)
    .single();
  
  if (!globalSetting?.is_enabled) {
    return false;
  }
  
  // Check organization setting
  const { data: orgSetting } = await supabase
    .from('organization_notification_settings')
    .select('is_enabled, contact_email, contact_phone, whatsapp_number')
    .eq('organization_id', orgId)
    .eq('channel', channel)
    .single();
  
  // If no org setting exists, default to enabled
  if (!orgSetting) {
    return true;
  }
  
  return orgSetting.is_enabled;
}

// Check if notification type is enabled for organization
async function isTypeEnabled(orgId: string, notificationType: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_notification_types')
    .select('is_enabled')
    .eq('organization_id', orgId)
    .eq('notification_type', notificationType)
    .single();
  
  // If no setting exists, default to enabled
  if (!data) {
    return true;
  }
  
  return data.is_enabled;
}

// Get notification template
async function getTemplate(notificationType: string, channel: string): Promise<{ subject?: string; body_template: string } | null> {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('subject, body_template')
    .eq('notification_type', notificationType)
    .eq('channel', channel)
    .eq('is_active', true)
    .single();
  
  if (error) {
    console.error('Error fetching template:', error);
    return null;
  }
  
  return data;
}

// Get recipient email for organization
async function getRecipientEmail(orgId: string): Promise<string | null> {
  // First check organization notification settings
  const { data: settings } = await supabase
    .from('organization_notification_settings')
    .select('contact_email')
    .eq('organization_id', orgId)
    .eq('channel', 'email')
    .single();
  
  if (settings?.contact_email) {
    return settings.contact_email;
  }
  
  // Fallback to organization owner email
  const { data: org } = await supabase
    .from('organizations')
    .select('owner_email')
    .eq('id', orgId)
    .single();
  
  return org?.owner_email || null;
}

// Get invoice data for billing notifications
async function getInvoiceData(invoiceId: string): Promise<Record<string, string> | null> {
  const { data, error } = await supabase
    .from('billing_invoices')
    .select('invoice_number, amount, total_payable, due_date, plan_name')
    .eq('id', invoiceId)
    .single();
  
  if (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
  
  return {
    invoice_number: data.invoice_number,
    amount: data.total_payable?.toString() || data.amount?.toString() || '0',
    due_date: data.due_date,
    plan_name: data.plan_name,
  };
}

// Log notification
async function logNotification(log: NotificationLog): Promise<string | null> {
  const { data, error } = await supabase
    .from('notification_logs')
    .insert(log)
    .select('id')
    .single();
  
  if (error) {
    console.error('Error logging notification:', error);
    return null;
  }
  
  return data.id;
}

// Update notification log status
async function updateNotificationStatus(logId: string, status: string, externalId?: string, failedReason?: string) {
  await supabase
    .from('notification_logs')
    .update({
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      external_id: externalId,
      failed_reason: failedReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

// Send email notification (placeholder - integrate with actual email service)
async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  // This is a placeholder - in production, integrate with Resend, SendGrid, etc.
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
  console.log(`[EMAIL] Body: ${body.substring(0, 200)}...`);
  
  // For now, simulate success
  // In production, you would:
  // 1. Check if RESEND_API_KEY is set
  // 2. Use Resend API to send email
  // 3. Return actual success/failure
  
  return { success: true, externalId: `email_${Date.now()}` };
}

// Send SMS notification (placeholder - integrate with actual SMS service)
async function sendSMS(to: string, body: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  console.log(`[SMS] To: ${to}`);
  console.log(`[SMS] Body: ${body}`);
  
  // Placeholder - integrate with local SMS gateway
  return { success: true, externalId: `sms_${Date.now()}` };
}

// Send WhatsApp notification (placeholder - integrate with Twilio/Meta)
async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
  console.log(`[WHATSAPP] To: ${to}`);
  console.log(`[WHATSAPP] Body: ${body}`);
  
  // Placeholder - integrate with Twilio or Meta WhatsApp API
  return { success: true, externalId: `wa_${Date.now()}` };
}

// Process a single notification
async function processNotification(
  orgId: string,
  notificationType: string,
  variables: Record<string, string>,
  channels: string[] = ['email']
): Promise<void> {
  const org = await getOrganizationData(orgId);
  if (!org) {
    console.error(`Organization not found: ${orgId}`);
    return;
  }
  
  // Add organization variables
  const allVariables: Record<string, string> = {
    ...variables,
    business_name: org.name,
    owner_name: variables.owner_name || org.name,
    payment_link: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app')}/pricing`,
  };
  
  // Check if notification type is enabled
  const typeEnabled = await isTypeEnabled(orgId, notificationType);
  if (!typeEnabled) {
    console.log(`Notification type ${notificationType} disabled for org ${orgId}`);
    return;
  }
  
  for (const channel of channels) {
    // Check if channel is enabled
    const channelEnabled = await isChannelEnabled(orgId, channel);
    if (!channelEnabled) {
      console.log(`Channel ${channel} disabled for org ${orgId}`);
      continue;
    }
    
    // Get template
    const template = await getTemplate(notificationType, channel);
    if (!template) {
      console.log(`No template found for ${notificationType} on ${channel}`);
      continue;
    }
    
    // Render template
    const body = renderTemplate(template.body_template, allVariables);
    const subject = template.subject ? renderTemplate(template.subject, allVariables) : undefined;
    
    // Get recipient
    let recipient: string | null = null;
    
    if (channel === 'email') {
      recipient = await getRecipientEmail(orgId);
    } else {
      // For SMS/WhatsApp, get from organization notification settings
      const { data: settings } = await supabase
        .from('organization_notification_settings')
        .select('contact_phone, whatsapp_number')
        .eq('organization_id', orgId)
        .eq('channel', channel)
        .single();
      
      if (channel === 'sms') {
        recipient = settings?.contact_phone || null;
      } else if (channel === 'whatsapp') {
        recipient = settings?.whatsapp_number || settings?.contact_phone || null;
      }
    }
    
    if (!recipient) {
      console.log(`No recipient found for ${channel} on org ${orgId}`);
      continue;
    }
    
    // Log notification
    const logId = await logNotification({
      organization_id: orgId,
      notification_type: notificationType,
      channel,
      recipient,
      subject,
      body,
      status: 'pending',
      metadata: allVariables,
    });
    
    if (!logId) continue;
    
    // Send notification
    let result: { success: boolean; externalId?: string; error?: string };
    
    try {
      if (channel === 'email') {
        result = await sendEmail(recipient, subject || 'Notification', body);
      } else if (channel === 'sms') {
        result = await sendSMS(recipient, body);
      } else if (channel === 'whatsapp') {
        result = await sendWhatsApp(recipient, body);
      } else {
        result = { success: false, error: 'Unknown channel' };
      }
      
      await updateNotificationStatus(
        logId,
        result.success ? 'sent' : 'failed',
        result.externalId,
        result.error
      );
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
      await updateNotificationStatus(logId, 'failed', undefined, String(error));
    }
  }
}

// Process scheduled reminders
async function processScheduledReminders(): Promise<number> {
  const now = new Date().toISOString();
  
  // Get pending reminders that are due
  const { data: reminders, error } = await supabase
    .from('scheduled_reminders')
    .select('*')
    .eq('is_processed', false)
    .lte('scheduled_for', now)
    .limit(100);
  
  if (error) {
    console.error('Error fetching scheduled reminders:', error);
    return 0;
  }
  
  if (!reminders || reminders.length === 0) {
    console.log('No scheduled reminders to process');
    return 0;
  }
  
  console.log(`Processing ${reminders.length} scheduled reminders`);
  
  for (const reminder of reminders as ScheduledReminder[]) {
    try {
      let variables: Record<string, string> = {};
      
      // If it's a billing reminder, get invoice data
      if (reminder.reference_type === 'billing_invoice' && reminder.reference_id) {
        const invoiceData = await getInvoiceData(reminder.reference_id);
        if (invoiceData) {
          variables = { ...variables, ...invoiceData };
        }
      }
      
      // Process the notification
      await processNotification(
        reminder.organization_id,
        reminder.notification_type,
        variables,
        ['email'] // Default to email, can be extended to check org preferences
      );
      
      // Mark as processed
      await supabase
        .from('scheduled_reminders')
        .update({
          is_processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', reminder.id);
      
    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
    }
  }
  
  return reminders.length;
}

// Check for overdue invoices and send reminders
async function processOverdueReminders(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Get overdue invoices that haven't been reminded in 3 days
  const { data: overdueInvoices, error } = await supabase
    .from('billing_invoices')
    .select('id, organization_id, invoice_number, total_payable, due_date')
    .eq('status', 'overdue')
    .lt('due_date', today);
  
  if (error) {
    console.error('Error fetching overdue invoices:', error);
    return 0;
  }
  
  if (!overdueInvoices || overdueInvoices.length === 0) {
    return 0;
  }
  
  let count = 0;
  
  for (const invoice of overdueInvoices) {
    // Check if we've sent an overdue reminder in the last 3 days
    const { data: recentReminder } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('organization_id', invoice.organization_id)
      .eq('notification_type', 'payment_overdue')
      .gte('created_at', threeDaysAgo)
      .single();
    
    if (recentReminder) {
      continue; // Skip if already reminded recently
    }
    
    // Send overdue reminder
    await processNotification(
      invoice.organization_id,
      'payment_overdue',
      {
        invoice_number: invoice.invoice_number,
        amount: invoice.total_payable?.toString() || '0',
        due_date: invoice.due_date,
      },
      ['email', 'sms']
    );
    
    count++;
  }
  
  return count;
}

// Retry failed notifications
async function retryFailedNotifications(): Promise<number> {
  const { data: failed, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .limit(50);
  
  if (error || !failed || failed.length === 0) {
    return 0;
  }
  
  let count = 0;
  
  for (const log of failed) {
    // Increment retry count
    await supabase
      .from('notification_logs')
      .update({
        retry_count: (log.retry_count || 0) + 1,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', log.id);
    
    // Attempt to resend
    let result: { success: boolean; externalId?: string; error?: string };
    
    try {
      if (log.channel === 'email') {
        result = await sendEmail(log.recipient, log.subject || 'Notification', log.body);
      } else if (log.channel === 'sms') {
        result = await sendSMS(log.recipient, log.body);
      } else if (log.channel === 'whatsapp') {
        result = await sendWhatsApp(log.recipient, log.body);
      } else {
        result = { success: false, error: 'Unknown channel' };
      }
      
      await updateNotificationStatus(
        log.id,
        result.success ? 'sent' : 'failed',
        result.externalId,
        result.error
      );
      
      if (result.success) count++;
    } catch (error) {
      await updateNotificationStatus(log.id, 'failed', undefined, String(error));
    }
  }
  
  return count;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    let result: Record<string, unknown> = {};
    
    switch (action) {
      case 'process_scheduled':
        const scheduledCount = await processScheduledReminders();
        result = { scheduled_processed: scheduledCount };
        break;
        
      case 'process_overdue':
        const overdueCount = await processOverdueReminders();
        result = { overdue_processed: overdueCount };
        break;
        
      case 'retry_failed':
        const retryCount = await retryFailedNotifications();
        result = { retried: retryCount };
        break;
        
      case 'send_notification':
        // Manual notification trigger
        if (!params.organization_id || !params.notification_type) {
          throw new Error('organization_id and notification_type required');
        }
        await processNotification(
          params.organization_id,
          params.notification_type,
          params.variables || {},
          params.channels || ['email']
        );
        result = { sent: true };
        break;
        
      case 'process_all':
      default:
        // Run all processors
        const scheduled = await processScheduledReminders();
        const overdue = await processOverdueReminders();
        const retried = await retryFailedNotifications();
        result = {
          scheduled_processed: scheduled,
          overdue_processed: overdue,
          retried: retried,
        };
        break;
    }
    
    console.log('Notification processing complete:', result);
    
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
    
  } catch (error) {
    console.error("Error processing notifications:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
