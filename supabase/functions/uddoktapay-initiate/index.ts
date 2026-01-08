import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  invoice_id: string;
  amount: number;
  full_name: string;
  email: string;
  return_url: string;
  cancel_url: string;
}

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

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { invoice_id, amount, full_name, email, return_url, cancel_url } = body;

    // Validate required fields
    if (!invoice_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid payment request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify invoice exists and belongs to user's organization
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, total, paid_amount, status, organization_id, invoice_number")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", invoice.organization_id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate due amount
    const dueAmount = Number(invoice.total) - Number(invoice.paid_amount);
    if (amount > dueAmount) {
      return new Response(
        JSON.stringify({ error: "Amount exceeds due amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique metadata
    const metadata = {
      invoice_id,
      invoice_number: invoice.invoice_number,
      organization_id: invoice.organization_id,
      user_id: user.id,
      initiated_at: new Date().toISOString(),
    };

    // UddoktaPay Checkout API
    const uddoktapayResponse = await fetch("https://api.uddoktapay.com/api/checkout-v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": uddoktapayApiKey,
      },
      body: JSON.stringify({
        full_name: full_name || "Customer",
        email: email || "customer@example.com",
        amount: amount.toFixed(2),
        metadata: JSON.stringify(metadata),
        redirect_url: return_url,
        cancel_url: cancel_url,
        webhook_url: `${supabaseUrl}/functions/v1/uddoktapay-webhook`,
      }),
    });

    if (!uddoktapayResponse.ok) {
      const errorText = await uddoktapayResponse.text();
      console.error("UddoktaPay API error:", errorText);
      throw new Error("Payment gateway error");
    }

    const paymentData = await uddoktapayResponse.json();

    // Log payment initiation
    await supabase.from("audit_logs").insert({
      action: "payment_initiated",
      entity_type: "invoice",
      entity_id: invoice_id,
      user_id: user.id,
      organization_id: invoice.organization_id,
      details: {
        amount,
        gateway: "uddoktapay",
        payment_url: paymentData.payment_url,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: paymentData.payment_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Payment initiation error:", error);
    const message = error instanceof Error ? error.message : "Payment initiation failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
