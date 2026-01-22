import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QuotationEmailRequest {
  quotation_id: string;
  email_type: 'sent' | 'accepted' | 'expiring_soon' | 'expired';
  recipient_email?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendEmail(to: string, subject: string, html: string, fromName: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await res.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { quotation_id, email_type, recipient_email }: QuotationEmailRequest = await req.json();

    // Fetch quotation details with customer info
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          company_name,
          phone
        ),
        quotation_items (
          id,
          description,
          quantity,
          unit,
          unit_price,
          discount,
          total
        )
      `)
      .eq('id', quotation_id)
      .single();

    if (quotationError || !quotation) {
      console.error('Error fetching quotation:', quotationError);
      return new Response(
        JSON.stringify({ error: 'Quotation not found' }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get organization details for branding
    const { data: org } = await supabase
      .from('organizations')
      .select('name, owner_email')
      .eq('id', quotation.organization_id)
      .single();

    const customerName = quotation.customers?.name || 'Valued Customer';
    const customerEmail = recipient_email || quotation.customers?.email;
    const companyName = org?.name || 'Our Company';
    const quotationNumber = quotation.quotation_number;
    const validUntil = quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-BD', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'N/A';
    const total = quotation.total?.toLocaleString('en-BD') || '0';

    if (!customerEmail) {
      console.log('No customer email available for quotation:', quotation_id);
      return new Response(
        JSON.stringify({ error: 'No recipient email available', skipped: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject = '';
    let htmlContent = '';

    const baseStyles = `
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .items-table th { background: #f9fafb; font-weight: 600; }
        .total-row { font-weight: bold; font-size: 18px; color: #1d4ed8; }
      </style>
    `;

    switch (email_type) {
      case 'sent':
        subject = `Quotation ${quotationNumber} from ${companyName}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 New Quotation</h1>
                <p>Quotation #${quotationNumber}</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Thank you for your interest in our services. Please find below the quotation for your review.</p>
                
                <div class="highlight">
                  <strong>📅 Valid Until:</strong> ${validUntil}<br>
                  <strong>💰 Total Amount:</strong> ৳${total}
                </div>

                ${quotation.quotation_items?.length > 0 ? `
                  <h3>Items:</h3>
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${quotation.quotation_items.map((item: any) => `
                        <tr>
                          <td>${item.description}</td>
                          <td>${item.quantity} ${item.unit || ''}</td>
                          <td>৳${item.unit_price?.toLocaleString('en-BD')}</td>
                          <td>৳${item.total?.toLocaleString('en-BD')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : ''}

                <p class="total-row">Grand Total: ৳${total}</p>

                ${quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : ''}

                <p>Please review and let us know if you have any questions or would like to proceed.</p>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
              <div class="footer">
                <p>This quotation is valid until ${validUntil}. Prices may change after expiry.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'accepted':
        subject = `Quotation ${quotationNumber} Accepted - Thank You!`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                <h1>✅ Quotation Accepted</h1>
                <p>Quotation #${quotationNumber}</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>Thank you for accepting our quotation! We're excited to work with you.</p>
                
                <div class="highlight" style="background: #d1fae5; border-left-color: #10b981;">
                  <strong>Quotation Number:</strong> ${quotationNumber}<br>
                  <strong>Amount:</strong> ৳${total}
                </div>

                <p>Our team will begin processing your order shortly. You will receive an invoice with payment details soon.</p>

                <p>If you have any questions, please don't hesitate to reach out.</p>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
              <div class="footer">
                <p>Thank you for choosing ${companyName}!</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'expiring_soon':
        subject = `⏰ Quotation ${quotationNumber} Expiring Soon!`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                <h1>⏰ Expiring Soon</h1>
                <p>Quotation #${quotationNumber}</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>This is a friendly reminder that your quotation is about to expire.</p>
                
                <div class="highlight">
                  <strong>⚠️ Expires On:</strong> ${validUntil}<br>
                  <strong>💰 Total Amount:</strong> ৳${total}
                </div>

                <p>If you're still interested, please let us know before the expiry date to lock in the current pricing.</p>

                <p>We'd love to work with you! Feel free to reach out if you have any questions.</p>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
              <div class="footer">
                <p>Don't miss out! Contact us today to proceed with your order.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'expired':
        subject = `Quotation ${quotationNumber} Has Expired`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>${baseStyles}</head>
          <body>
            <div class="container">
              <div class="header" style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);">
                <h1>📋 Quotation Expired</h1>
                <p>Quotation #${quotationNumber}</p>
              </div>
              <div class="content">
                <p>Dear ${customerName},</p>
                <p>This is to inform you that your quotation has expired.</p>
                
                <div class="highlight" style="background: #f3f4f6; border-left-color: #6b7280;">
                  <strong>Quotation Number:</strong> ${quotationNumber}<br>
                  <strong>Previous Amount:</strong> ৳${total}
                </div>

                <p>If you're still interested in our services, we'd be happy to prepare a fresh quotation for you with updated pricing.</p>

                <p>Please contact us to get started!</p>
                
                <p>Best regards,<br>${companyName}</p>
              </div>
              <div class="footer">
                <p>We're here to help whenever you're ready.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    const emailResponse = await sendEmail(customerEmail, subject, htmlContent, companyName);
    console.log("Quotation email sent successfully:", emailResponse);

    // Log the notification
    await supabase.from('notification_logs').insert({
      organization_id: quotation.organization_id,
      notification_type: 'quotation_reminder',
      channel: 'email',
      recipient: customerEmail,
      subject,
      body: `Quotation ${quotationNumber} - ${email_type}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, email_id: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-quotation-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
