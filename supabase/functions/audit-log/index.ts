import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AuditLogRequest {
  actor_id?: string;
  actor_email?: string;
  actor_role?: string;
  actor_type?: 'user' | 'system' | 'api';
  action_type: 'login' | 'logout' | 'login_failed' | 'create' | 'update' | 'delete' | 'access' | 'suspend' | 'activate' | 'configure' | 'export' | 'import';
  action_label: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  organization_id?: string;
  organization_name?: string;
  source?: 'ui' | 'api' | 'system' | 'edge_function' | 'webhook';
  metadata?: Record<string, unknown>;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create Supabase client with service role for inserting audit logs
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get request data
    const body: AuditLogRequest = await req.json();
    
    // Extract IP and user agent from request headers
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Validate required fields
    if (!body.action_type || !body.action_label || !body.entity_type) {
      console.error('Missing required fields:', { action_type: body.action_type, action_label: body.action_label, entity_type: body.entity_type });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action_type, action_label, entity_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert audit log using the database function
    const { data, error } = await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: body.actor_id || null,
      p_actor_email: body.actor_email || null,
      p_actor_role: body.actor_role || null,
      p_actor_type: body.actor_type || 'user',
      p_action_type: body.action_type,
      p_action_label: body.action_label,
      p_entity_type: body.entity_type,
      p_entity_id: body.entity_id || null,
      p_entity_name: body.entity_name || null,
      p_organization_id: body.organization_id || null,
      p_organization_name: body.organization_name || null,
      p_source: body.source || 'ui',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: body.metadata || null,
      p_before_state: body.before_state || null,
      p_after_state: body.after_state || null,
    });

    if (error) {
      console.error('Error inserting audit log:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to insert audit log', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Audit log created successfully:', data);

    return new Response(
      JSON.stringify({ success: true, id: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in audit-log function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
