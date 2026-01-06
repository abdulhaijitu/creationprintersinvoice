import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan features configuration (must match frontend)
const planFeatures: Record<string, string[]> = {
  free: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data'],
  basic: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports'],
  pro: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support'],
  enterprise: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support', 'api_access', 'custom_branding', 'white_label'],
};

// Organization role permissions
const orgPermissions: Record<string, Record<string, string[]>> = {
  dashboard: { view: ['owner', 'manager', 'accounts', 'staff'] },
  customers: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  invoices: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager', 'accounts'], delete: ['owner'] },
  quotations: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  expenses: { view: ['owner', 'manager', 'accounts'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager', 'accounts'], delete: ['owner'] },
  vendors: { view: ['owner', 'manager', 'accounts'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager', 'accounts'], delete: ['owner'] },
  employees: { view: ['owner', 'manager'], create: ['owner'], edit: ['owner', 'manager'], delete: ['owner'] },
  salary: { view: ['owner', 'accounts'], create: ['owner', 'accounts'], edit: ['owner', 'accounts'], delete: ['owner'] },
  settings: { view: ['owner'], edit: ['owner'] },
  billing: { view: ['owner'], edit: ['owner'] },
  team_members: { view: ['owner', 'manager'], create: ['owner'], edit: ['owner'], delete: ['owner'] },
};

interface AccessCheckRequest {
  feature?: string;
  module?: string;
  action?: string;
  organizationId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', hasAccess: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', hasAccess: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const { feature, module, action = 'view', organizationId }: AccessCheckRequest = await req.json();

    // Check if user is super_admin (bypasses all checks)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData?.role === 'super_admin') {
      return new Response(
        JSON.stringify({ hasAccess: true, isSuperAdmin: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ 
          error: 'Not a member of this organization', 
          hasAccess: false,
          blockedByRole: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgRole = membership.role;

    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    // Check subscription status
    const isTrialExpired = subscription?.status === 'expired' || 
      (subscription?.status === 'trial' && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date());
    
    const isSubscriptionActive = subscription?.status === 'active' || 
      (subscription?.status === 'trial' && !isTrialExpired);

    // If subscription is not active, block write operations
    if (!isSubscriptionActive && action !== 'view') {
      return new Response(
        JSON.stringify({ 
          error: 'Subscription expired', 
          hasAccess: false,
          blockedByPlan: true,
          message: 'Your subscription has expired. Please upgrade to continue.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check plan feature if specified
    if (feature) {
      const plan = subscription?.plan || 'free';
      const allowedFeatures = planFeatures[plan] || planFeatures.free;
      
      if (!allowedFeatures.includes(feature)) {
        return new Response(
          JSON.stringify({ 
            error: 'Feature not available', 
            hasAccess: false,
            blockedByPlan: true,
            requiredPlan: getMinimumPlanForFeature(feature),
            message: `This feature requires a higher plan.`
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check module permission if specified
    if (module) {
      const modulePerms = orgPermissions[module];
      if (modulePerms) {
        const allowedRoles = modulePerms[action] || [];
        if (!allowedRoles.includes(orgRole)) {
          return new Response(
            JSON.stringify({ 
              error: 'Permission denied', 
              hasAccess: false,
              blockedByRole: true,
              message: `You don't have permission to ${action} ${module}.`
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ hasAccess: true, orgRole, plan: subscription?.plan }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-access:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', hasAccess: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getMinimumPlanForFeature(feature: string): string {
  const plans = ['free', 'basic', 'pro', 'enterprise'];
  for (const plan of plans) {
    if (planFeatures[plan].includes(feature)) {
      return plan;
    }
  }
  return 'enterprise';
}
