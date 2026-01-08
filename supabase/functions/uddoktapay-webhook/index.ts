import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, rt-uddoktapay-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uddoktapayApiKey = Deno.env.get("UDDOKTAPAY_API_KEY");

    if (!uddoktapayApiKey) {
      throw new Error("UddoktaPay API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload));

    const {
      invoice_id: uddoktapayInvoiceId,
      status,
      amount,
      fee,
      charged_amount,
      transaction_id,
      payment_method,
      sender_number,
      metadata: metadataStr,
    } = payload;

    // Parse metadata
    let metadata: {
      invoice_id?: string;
      invoice_number?: string;
      organization_id?: string;
      user_id?: string;
    } = {};
    
    try {
      metadata = metadataStr ? JSON.parse(metadataStr) : {};
    } catch {
      console.error("Failed to parse metadata");
    }

    const invoiceId = metadata.invoice_id;
    const organizationId = metadata.organization_id;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Missing invoice_id in metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment with UddoktaPay API (prevent replay attacks)
    const verifyResponse = await fetch("https://api.uddoktapay.com/api/verify-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": uddoktapayApiKey,
      },
      body: JSON.stringify({ invoice_id: uddoktapayInvoiceId }),
    });

    if (!verifyResponse.ok) {
      console.error("Payment verification failed");
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifiedPayment = await verifyResponse.json();
    console.log("Verified payment:", JSON.stringify(verifiedPayment));

    // Only process completed payments
    if (verifiedPayment.status !== "COMPLETED") {
      console.log("Payment not completed, status:", verifiedPayment.status);
      return new Response(
        JSON.stringify({ message: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate webhook (idempotency)
    const { data: existingPayment } = await supabase
      .from("invoice_payments")
      .select("id")
      .eq("reference", transaction_id)
      .single();

    if (existingPayment) {
      console.log("Duplicate webhook detected, payment already processed");
      return new Response(
        JSON.stringify({ message: "Payment already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, total, paid_amount, status")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found:", invoiceId);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentAmount = parseFloat(verifiedPayment.amount) || parseFloat(amount);
    const newPaidAmount = Number(invoice.paid_amount) + paymentAmount;
    const newStatus = newPaidAmount >= Number(invoice.total) ? "paid" : "partial";

    // Insert payment record
    const { error: paymentError } = await supabase.from("invoice_payments").insert({
      invoice_id: invoiceId,
      amount: paymentAmount,
      payment_method: payment_method || "uddoktapay",
      payment_date: new Date().toISOString().split("T")[0],
      reference: transaction_id,
      notes: `UddoktaPay payment - Sender: ${sender_number || "N/A"}, Fee: ${fee || 0}`,
      organization_id: organizationId,
    });

    if (paymentError) {
      console.error("Failed to insert payment:", paymentError);
      throw paymentError;
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Failed to update invoice:", updateError);
      throw updateError;
    }

    // Log payment event
    await supabase.from("audit_logs").insert({
      action: "payment_received",
      entity_type: "invoice",
      entity_id: invoiceId,
      organization_id: organizationId,
      details: {
        amount: paymentAmount,
        gateway: "uddoktapay",
        transaction_id,
        payment_method,
        sender_number,
        fee,
        charged_amount,
        new_paid_amount: newPaidAmount,
        new_status: newStatus,
      },
    });

    // Create notification for the user
    if (metadata.user_id) {
      await supabase.from("notifications").insert({
        user_id: metadata.user_id,
        organization_id: organizationId,
        title: "Payment Received",
        message: `Payment of ৳${paymentAmount.toFixed(2)} received for invoice ${metadata.invoice_number}`,
        type: "payment",
        reference_type: "invoice",
        reference_id: invoiceId,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
