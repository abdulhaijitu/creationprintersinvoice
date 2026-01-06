import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateOrganizationRequest {
  organizationId: string;
  updates: {
    name?: string;
    plan?: 'free' | 'basic' | 'pro' | 'enterprise';
    status?: 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';
    trialEndsAt?: string | null;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check super_admin permission
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, updates }: UpdateOrganizationRequest = await req.json();
    
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing organization update for ${organizationId} by ${user.email}`);

    // Get current state for audit
    const { data: currentOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, email, phone')
      .eq('id', organizationId)
      .single();

    if (orgError || !currentOrg) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const now = new Date().toISOString();

    // Update organization name if changed
    if (updates.name && updates.name !== currentOrg.name) {
      const { error: nameError } = await supabase
        .from('organizations')
        .update({ name: updates.name, updated_at: now })
        .eq('id', organizationId);

      if (nameError) {
        throw new Error(`Failed to update organization name: ${nameError.message}`);
      }
      changes.name = { old: currentOrg.name, new: updates.name };
    }

    // Update subscription if plan/status/trial changes
    const subUpdates: Record<string, unknown> = {};
    
    if (updates.plan && updates.plan !== currentSub?.plan) {
      const validPlans = ['free', 'basic', 'pro', 'enterprise'];
      if (!validPlans.includes(updates.plan)) {
        return new Response(
          JSON.stringify({ error: 'Invalid plan value' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      subUpdates.plan = updates.plan;
      changes.plan = { old: currentSub?.plan || 'free', new: updates.plan };

      // Get plan limits
      const { data: planLimits } = await supabase
        .from('plan_limits')
        .select('user_limit')
        .eq('plan_name', updates.plan)
        .single();
      
      subUpdates.user_limit = planLimits?.user_limit || 
        (updates.plan === 'free' ? 2 : updates.plan === 'basic' ? 5 : updates.plan === 'pro' ? 15 : 999);
    }

    if (updates.status && updates.status !== currentSub?.status) {
      const validStatuses = ['trial', 'active', 'suspended', 'expired', 'cancelled'];
      if (!validStatuses.includes(updates.status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status value' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      subUpdates.status = updates.status;
      changes.status = { old: currentSub?.status || 'trial', new: updates.status };
    }

    if (updates.trialEndsAt !== undefined && updates.trialEndsAt !== currentSub?.trial_ends_at) {
      subUpdates.trial_ends_at = updates.trialEndsAt;
      changes.trial_ends_at = { old: currentSub?.trial_ends_at, new: updates.trialEndsAt };
    }

    if (Object.keys(subUpdates).length > 0) {
      subUpdates.updated_at = now;

      if (currentSub) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update(subUpdates)
          .eq('organization_id', organizationId);

        if (subError) {
          throw new Error(`Failed to update subscription: ${subError.message}`);
        }
      } else {
        // Create subscription if doesn't exist
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            organization_id: organizationId,
            plan: updates.plan || 'free',
            status: updates.status || 'trial',
            trial_ends_at: updates.trialEndsAt,
            user_limit: subUpdates.user_limit || 2
          });

        if (insertError) {
          throw new Error(`Failed to create subscription: ${insertError.message}`);
        }
      }
    }

    // Log audit if there were changes
    if (Object.keys(changes).length > 0) {
      const { error: auditError } = await supabase.rpc('insert_audit_log', {
        p_actor_id: user.id,
        p_actor_email: user.email,
        p_actor_role: 'super_admin',
        p_actor_type: 'admin',
        p_action_type: 'update',
        p_action_label: `Organization updated: ${Object.keys(changes).join(', ')}`,
        p_entity_type: 'organization',
        p_entity_id: organizationId,
        p_entity_name: updates.name || currentOrg.name,
        p_organization_id: organizationId,
        p_organization_name: updates.name || currentOrg.name,
        p_source: 'admin_console',
        p_metadata: { changes },
        p_before_state: {
          name: currentOrg.name,
          plan: currentSub?.plan,
          status: currentSub?.status,
          trial_ends_at: currentSub?.trial_ends_at
        },
        p_after_state: {
          name: updates.name || currentOrg.name,
          plan: updates.plan || currentSub?.plan,
          status: updates.status || currentSub?.status,
          trial_ends_at: updates.trialEndsAt ?? currentSub?.trial_ends_at
        }
      });

      if (auditError) {
        console.warn('Failed to log audit:', auditError);
      }
    }

    // Get updated organization
    const { data: updatedOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    const { data: updatedSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    console.log(`Successfully updated organization ${organizationId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Organization updated successfully',
        organization: updatedOrg,
        subscription: updatedSub,
        changes
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in update-organization:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
