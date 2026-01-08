import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { invoice_id: uddoktapayInvoiceId } = await req.json();

    if (!uddoktapayInvoiceId) {
      return new Response(
        JSON.stringify({ error: "Missing invoice_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify payment with UddoktaPay
    const verifyResponse = await fetch("https://api.uddoktapay.com/api/verify-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": uddoktapayApiKey,
      },
      body: JSON.stringify({ invoice_id: uddoktapayInvoiceId }),
    });

    if (!verifyResponse.ok) {
      throw new Error("Payment verification failed");
    }

    const verifiedPayment = await verifyResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        status: verifiedPayment.status,
        amount: verifiedPayment.amount,
        transaction_id: verifiedPayment.transaction_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Verification error:", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
