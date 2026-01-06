import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpgradeRequest {
  organizationId: string;
  requestedPlan: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, requestedPlan }: UpgradeRequest = await req.json();

    // Validate plan
    const validPlans = ['basic', 'pro', 'enterprise'];
    if (!validPlans.includes(requestedPlan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user is owner of the organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only organization owners can request plan upgrades' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('organization_id', organizationId)
      .single();

    const currentPlan = subscription?.plan || 'free';

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('plan_upgrade_requests')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'You already have a pending upgrade request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create upgrade request
    const { data: request, error: insertError } = await supabase
      .from('plan_upgrade_requests')
      .insert({
        organization_id: organizationId,
        organization_name: org.name,
        current_plan: currentPlan,
        requested_plan: requestedPlan,
        requested_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating upgrade request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create upgrade request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for super admins
    const { data: superAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (superAdmins && superAdmins.length > 0) {
      const notifications = superAdmins.map((admin) => ({
        user_id: admin.user_id,
        title: 'Plan Upgrade Request',
        message: `${org.name} has requested to upgrade from ${currentPlan} to ${requestedPlan}`,
        type: 'plan_upgrade',
        reference_type: 'plan_upgrade_request',
        reference_id: request.id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Log audit event
    await supabase.from('enhanced_audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      actor_type: 'user',
      action_type: 'create',
      action_label: `Plan upgrade requested: ${currentPlan} → ${requestedPlan}`,
      entity_type: 'plan_upgrade_request',
      entity_id: request.id,
      entity_name: org.name,
      organization_id: organizationId,
      organization_name: org.name,
      source: 'ui',
      metadata: {
        current_plan: currentPlan,
        requested_plan: requestedPlan,
      },
    });

    return new Response(
      JSON.stringify({ success: true, request }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});