import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderConfig {
  daysBefore?: number;
  daysAfter?: number;
  type: 'due_soon' | 'due_today' | 'overdue';
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  paid_amount: number | null;
  due_date: string;
  customer_id: string;
  organization_id: string;
  status: string;
  customer?: {
    name: string;
    email: string | null;
  };
  organization?: {
    name: string;
    email: string | null;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email sending');
      return new Response(
        JSON.stringify({ success: true, message: 'Email sending skipped - no API key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for manual trigger or use scheduled mode
    let configs: ReminderConfig[] = [];
    let organizationId: string | null = null;
    
    try {
      const body = await req.json();
      if (body.configs) configs = body.configs;
      if (body.organization_id) organizationId = body.organization_id;
    } catch {
      // Default: run all reminder types
      configs = [
        { type: 'due_soon', daysBefore: 3 },
        { type: 'due_today' },
        { type: 'overdue', daysAfter: 1 },
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const results: { type: string; sent: number; errors: string[] }[] = [];

    for (const config of configs) {
      const typeResult = { type: config.type, sent: 0, errors: [] as string[] };
      
      let query = supabaseAdmin
        .from('invoices')
        .select(`
          id, invoice_number, total, paid_amount, due_date, customer_id, organization_id, status,
          customer:customers(name, email),
          organization:organizations(name, email)
        `)
        .neq('status', 'paid')
        .not('customer.email', 'is', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      // Apply date filter based on type
      if (config.type === 'due_soon' && config.daysBefore) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + config.daysBefore);
        const dateStr = targetDate.toISOString().split('T')[0];
        query = query.eq('due_date', dateStr);
      } else if (config.type === 'due_today') {
        const dateStr = today.toISOString().split('T')[0];
        query = query.eq('due_date', dateStr);
      } else if (config.type === 'overdue' && config.daysAfter) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - config.daysAfter);
        const dateStr = targetDate.toISOString().split('T')[0];
        query = query.eq('due_date', dateStr);
      }

      const { data: invoices, error: queryError } = await query;

      if (queryError) {
        typeResult.errors.push(`Query error: ${queryError.message}`);
        results.push(typeResult);
        continue;
      }

      if (!invoices || invoices.length === 0) {
        results.push(typeResult);
        continue;
      }

      // Process each invoice - Supabase returns relations as arrays
      for (const rawInvoice of invoices) {
        const inv = rawInvoice as {
          id: string;
          invoice_number: string;
          total: number;
          paid_amount: number | null;
          due_date: string;
          organization_id: string;
          status: string;
          customer: { name: string; email: string | null }[] | null;
          organization: { name: string; email: string | null }[] | null;
        };
        const customer = inv.customer?.[0];
        const org = inv.organization?.[0];
        
        if (!customer?.email) continue;

        const dueAmount = inv.total - (inv.paid_amount || 0);
        const subject = getEmailSubject(config.type, inv.invoice_number);
        const html = getEmailHtml(config.type, {
          customerName: customer.name,
          invoiceNumber: inv.invoice_number,
          dueAmount,
          dueDate: inv.due_date,
          orgName: org?.name || 'Our Company',
        });

        try {
          // Check if we already sent this reminder today (idempotency)
          const { data: existingLog } = await supabaseAdmin
            .from('notification_logs')
            .select('id')
            .eq('organization_id', inv.organization_id)
            .eq('notification_type', config.type === 'due_soon' ? 'payment_due_soon' : 
                                     config.type === 'due_today' ? 'payment_due_today' : 'payment_overdue')
            .eq('recipient', customer.email)
            .gte('created_at', today.toISOString())
            .limit(1);

          if (existingLog && existingLog.length > 0) {
            console.log(`Skipping duplicate reminder for ${customer.email}`);
            continue;
          }

          // Send the email
          const emailResult = await resend.emails.send({
            from: 'PrintoSaaS <noreply@resend.dev>',
            to: [customer.email],
            subject,
            html,
          });

          // Log the notification
          await supabaseAdmin.from('notification_logs').insert({
            organization_id: inv.organization_id,
            notification_type: config.type === 'due_soon' ? 'payment_due_soon' : 
                              config.type === 'due_today' ? 'payment_due_today' : 'payment_overdue',
            channel: 'email',
            recipient: customer.email,
            subject,
            body: html,
            status: 'sent',
            sent_at: new Date().toISOString(),
            external_id: emailResult.data?.id || null,
            metadata: { invoice_id: inv.id, invoice_number: inv.invoice_number },
          });

          typeResult.sent++;
        } catch (emailError: unknown) {
          const errMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
          typeResult.errors.push(`Failed to send to ${customer.email}: ${errMsg}`);
          
          // Log failed notification
          await supabaseAdmin.from('notification_logs').insert({
            organization_id: inv.organization_id,
            notification_type: config.type === 'due_soon' ? 'payment_due_soon' : 
                              config.type === 'due_today' ? 'payment_due_today' : 'payment_overdue',
            channel: 'email',
            recipient: customer.email,
            subject,
            body: html,
            status: 'failed',
            failed_reason: errMsg,
            metadata: { invoice_id: inv.id },
          });
        }
      }

      results.push(typeResult);
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Reminder emails completed: ${totalSent} sent, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: { totalSent, totalErrors },
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-reminder-emails:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getEmailSubject(type: string, invoiceNumber: string): string {
  switch (type) {
    case 'due_soon':
      return `Reminder: Invoice ${invoiceNumber} is due soon`;
    case 'due_today':
      return `Reminder: Invoice ${invoiceNumber} is due today`;
    case 'overdue':
      return `Urgent: Invoice ${invoiceNumber} is overdue`;
    default:
      return `Invoice ${invoiceNumber} - Payment Reminder`;
  }
}

function getEmailHtml(type: string, data: {
  customerName: string;
  invoiceNumber: string;
  dueAmount: number;
  dueDate: string;
  orgName: string;
}): string {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);

  const urgency = type === 'overdue' ? 'overdue' : type === 'due_today' ? 'due today' : 'due soon';
  const color = type === 'overdue' ? '#dc2626' : type === 'due_today' ? '#d97706' : '#2563eb';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: ${color}; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
        </div>
        
        <div style="padding: 32px;">
          <p style="margin: 0 0 16px; font-size: 16px;">Dear ${data.customerName},</p>
          
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
            This is a friendly reminder that Invoice <strong>#${data.invoiceNumber}</strong> is ${urgency}.
          </p>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">#${data.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: ${color};">${formatCurrency(data.dueAmount)}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.5;">
            Please ensure payment is made by the due date to avoid any late fees. If you have already made the payment, please disregard this reminder.
          </p>
          
          <p style="margin: 0; font-size: 14px; color: #374151;">
            Thank you for your business!<br>
            <strong>${data.orgName}</strong>
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
          This is an automated reminder. Please do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `;
}
