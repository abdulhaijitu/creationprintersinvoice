import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { invoice_id, amount, payment_method, payment_date, reference, notes } = body;

    // Validate required fields
    if (!invoice_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invoice ID and valid amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the invoice to verify organization and calculate remaining
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, organization_id, total, paid_amount, invoice_number")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organization membership and role
    const { data: membership, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", invoice.organization_id)
      .single();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not a member of this organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check role permissions (owner, manager, accounts can record payments)
    const allowedRoles = ["owner", "manager", "accounts"];
    if (!allowedRoles.includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to record payments" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate payment amount doesn't exceed remaining due
    const remaining = Number(invoice.total) - Number(invoice.paid_amount || 0);
    if (amount > remaining) {
      return new Response(
        JSON.stringify({ error: "Payment amount cannot exceed remaining due amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from("invoice_payments")
      .insert({
        invoice_id: invoice_id,
        organization_id: invoice.organization_id,
        amount: amount,
        payment_method: payment_method || "cash",
        payment_date: payment_date || new Date().toISOString().split("T")[0],
        reference: reference || null,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to record payment", details: paymentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate new paid amount and status
    const newPaidAmount = Number(invoice.paid_amount || 0) + amount;
    const newStatus = newPaidAmount >= Number(invoice.total) ? "paid" : "partial";

    // Update invoice atomically
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        paid_amount: newPaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice_id);

    if (updateError) {
      console.error("Invoice update error:", updateError);
      // Payment was recorded but invoice update failed - log this
      return new Response(
        JSON.stringify({ 
          error: "Payment recorded but invoice update failed", 
          payment: payment,
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      action: "payment_added",
      entity_type: "invoice",
      entity_id: invoice_id,
      organization_id: invoice.organization_id,
      user_id: user.id,
      details: {
        invoice_number: invoice.invoice_number,
        amount: amount,
        payment_method: payment_method,
        reference: reference || null,
        new_paid_amount: newPaidAmount,
        new_status: newStatus,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment: payment,
        invoice: {
          id: invoice_id,
          paid_amount: newPaidAmount,
          status: newStatus,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
