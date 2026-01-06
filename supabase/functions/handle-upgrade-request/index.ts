import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HandleRequest {
  requestId: string;
  action: 'approve' | 'reject';
  notes?: string;
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

    // Check if user is super admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId, action, notes }: HandleRequest = await req.json();

    // Get the upgrade request
    const { data: request, error: requestError } = await supabase
      .from('plan_upgrade_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Upgrade request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Request has already been processed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the request status
    const { error: updateError } = await supabase
      .from('plan_upgrade_requests')
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If approved, update the organization's subscription
    if (action === 'approve') {
      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('organization_id', request.organization_id)
        .maybeSingle();

      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            plan: request.requested_plan,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', request.organization_id);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            organization_id: request.organization_id,
            plan: request.requested_plan,
            status: 'active',
          });
      }
    }

    // Notify the organization owner
    if (request.requested_by) {
      const message = action === 'approve'
        ? `Your plan upgrade to ${request.requested_plan} has been approved. New features are now available.`
        : `Your plan upgrade request to ${request.requested_plan} was not approved.${notes ? ` Reason: ${notes}` : ''}`;

      await supabase.from('notifications').insert({
        user_id: request.requested_by,
        organization_id: request.organization_id,
        title: action === 'approve' ? 'Plan Upgrade Approved' : 'Plan Upgrade Declined',
        message,
        type: 'plan_upgrade',
        reference_type: 'plan_upgrade_request',
        reference_id: requestId,
      });
    }

    // Log audit event
    await supabase.from('enhanced_audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      actor_role: 'super_admin',
      actor_type: 'admin',
      action_type: 'update',
      action_label: `Plan upgrade ${action}d: ${request.organization_name} (${request.current_plan} → ${request.requested_plan})`,
      entity_type: 'plan_upgrade_request',
      entity_id: requestId,
      entity_name: request.organization_name,
      organization_id: request.organization_id,
      organization_name: request.organization_name,
      source: 'admin',
      before_state: { status: 'pending' },
      after_state: { status: newStatus },
      metadata: {
        action,
        notes,
        current_plan: request.current_plan,
        requested_plan: request.requested_plan,
      },
    });

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
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