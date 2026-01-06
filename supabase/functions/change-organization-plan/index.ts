import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlanChangeRequest {
  organizationId: string;
  newPlan: 'free' | 'basic' | 'pro' | 'enterprise';
  adminEmail?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is a super admin or admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['super_admin', 'admin'].includes(userRole.role)) {
      console.error('Role check failed:', roleError, userRole);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { organizationId, newPlan, adminEmail }: PlanChangeRequest = await req.json();
    
    if (!organizationId || !newPlan) {
      return new Response(
        JSON.stringify({ error: 'organizationId and newPlan are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate plan value
    const validPlans = ['free', 'basic', 'pro', 'enterprise'];
    if (!validPlans.includes(newPlan)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing plan change for org ${organizationId} to ${newPlan} by ${user.email}`);

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Organization not found:', orgError);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current subscription
    const { data: currentSubscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const previousPlan = currentSubscription?.plan || 'free';
    const previousStatus = currentSubscription?.status || 'expired';

    // Check if same plan (no-op)
    if (previousPlan === newPlan && previousStatus === 'active') {
      console.log('Same plan selected, no changes needed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Plan is already set',
          subscription: currentSubscription,
          noChange: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get plan limits for the new plan
    const { data: planLimits } = await supabase
      .from('plan_limits')
      .select('user_limit')
      .eq('plan_name', newPlan)
      .single();

    const userLimit = planLimits?.user_limit || (newPlan === 'free' ? 2 : newPlan === 'basic' ? 5 : newPlan === 'pro' ? 15 : 999);

    // Determine new status based on plan change type
    let newStatus: string;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    if (newPlan === 'free') {
      // Downgrade to free
      newStatus = 'active';
    } else if (previousStatus === 'trial') {
      // Trial to paid - keep as trial until trial ends, or activate if trial expired
      const trialEndsAt = currentSubscription?.trial_ends_at ? new Date(currentSubscription.trial_ends_at) : null;
      if (trialEndsAt && trialEndsAt > now) {
        newStatus = 'trial';
      } else {
        newStatus = 'active';
      }
    } else if (previousStatus === 'expired' || previousStatus === 'cancelled' || previousStatus === 'suspended') {
      // Reactivation
      newStatus = 'active';
    } else {
      // Upgrade/downgrade between paid plans
      newStatus = 'active';
    }

    let subscription;

    if (currentSubscription) {
      // Update existing subscription
      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan: newPlan,
          status: newStatus,
          user_limit: userLimit,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }
      subscription = updatedSub;
    } else {
      // Create new subscription
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          plan: newPlan,
          status: newStatus,
          user_limit: userLimit,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create subscription:', insertError);
        throw new Error(`Failed to create subscription: ${insertError.message}`);
      }
      subscription = newSub;
    }

    // Determine change type for audit
    let changeType = 'plan_change';
    if (previousStatus === 'expired' || previousStatus === 'cancelled') {
      changeType = 'reactivation';
    } else if (previousStatus === 'trial' && newStatus === 'active') {
      changeType = 'conversion';
    } else if (validPlans.indexOf(newPlan) > validPlans.indexOf(previousPlan)) {
      changeType = 'upgrade';
    } else if (validPlans.indexOf(newPlan) < validPlans.indexOf(previousPlan)) {
      changeType = 'downgrade';
    }

    // Log to enhanced audit logs
    const { error: auditError } = await supabase.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: user.email || adminEmail,
      p_actor_role: userRole.role,
      p_actor_type: 'admin',
      p_action_type: 'update',
      p_action_label: `Plan ${changeType}: ${previousPlan} → ${newPlan}`,
      p_entity_type: 'subscription',
      p_entity_id: organizationId,
      p_entity_name: organization.name,
      p_organization_id: organizationId,
      p_organization_name: organization.name,
      p_source: 'admin_console',
      p_metadata: {
        change_type: changeType,
        previous_plan: previousPlan,
        new_plan: newPlan,
        previous_status: previousStatus,
        new_status: newStatus
      },
      p_before_state: currentSubscription ? {
        plan: previousPlan,
        status: previousStatus,
        user_limit: currentSubscription.user_limit
      } : null,
      p_after_state: {
        plan: newPlan,
        status: newStatus,
        user_limit: userLimit
      }
    });

    if (auditError) {
      console.warn('Failed to log audit:', auditError);
      // Don't fail the request for audit log failure
    }

    console.log(`Successfully changed plan for ${organization.name}: ${previousPlan} → ${newPlan} (${changeType})`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plan successfully changed to ${newPlan}`,
        subscription,
        changeType,
        previousPlan,
        newPlan,
        previousStatus,
        newStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in change-organization-plan:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

