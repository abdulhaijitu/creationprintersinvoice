import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequest {
  to: string;
  message: string;
  provider?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, provider } = await req.json() as SmsRequest;

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing "to" or "message"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const smsApiKey = Deno.env.get('SMS_API_KEY');
    const smsSenderId = Deno.env.get('SMS_SENDER_ID') || 'PrintoSaaS';
    const smsProvider = provider || Deno.env.get('SMS_PROVIDER') || 'bulksmsbd';

    if (!smsApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    if (smsProvider === 'bulksmsbd') {
      // BulkSMSBD API
      const url = `http://bulksmsbd.net/api/smsapi`;
      const params = new URLSearchParams({
        api_key: smsApiKey,
        type: 'text',
        number: to,
        senderid: smsSenderId,
        message: message,
      });

      const response = await fetch(`${url}?${params.toString()}`);
      result = await response.json();
    } else if (smsProvider === 'sslwireless') {
      // SSL Wireless API
      const url = 'https://smsplus.sslwireless.com/api/v3/send-sms';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: smsApiKey,
          sid: smsSenderId,
          msisdn: to,
          sms: message,
          csms_id: `msg_${Date.now()}`,
        }),
      });
      result = await response.json();
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported provider: ${smsProvider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SMS sent to ${to} via ${smsProvider}:`, result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SMS Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
