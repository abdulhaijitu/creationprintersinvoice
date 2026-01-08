import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ROLE SYSTEM ARCHITECTURE
 * 
 * 1. System Role (super_admin) - Platform-level, stored in user_roles table
 *    - Can manage organizations, plans, etc.
 *    - CANNOT perform organization business operations unless impersonating
 * 
 * 2. Organization Roles (owner, manager, accounts, staff) - Stored in organization_members table
 *    - Apply ONLY within their organization context
 */

// Organization role hierarchy - MUST match database enum 'org_role'
// Values: owner, manager, accounts, staff
const ORG_ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  manager: 75,
  accounts: 50,
  staff: 25,
};

// Plan features configuration
const planFeatures: Record<string, string[]> = {
  free: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data'],
  basic: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports'],
  pro: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support'],
  enterprise: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support', 'api_access', 'custom_branding', 'white_label'],
};

// Organization permission matrix - MUST match database enum 'org_role'
// Available roles: owner, manager, accounts, staff
const ORG_PERMISSION_MATRIX: Record<string, Record<string, string[]>> = {
  dashboard: { view: ['owner', 'manager', 'accounts', 'staff'], create: [], edit: [], delete: [] },
  customers: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'] 
  },
  invoices: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'accounts'], 
    edit: ['owner', 'manager', 'accounts'], 
    delete: ['owner'] 
  },
  quotations: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'] 
  },
  expenses: { 
    view: ['owner', 'manager', 'accounts'], 
    create: ['owner', 'manager', 'accounts'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'] 
  },
  vendors: { 
    view: ['owner', 'manager', 'accounts'], 
    create: ['owner', 'manager', 'accounts'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'] 
  },
  delivery_challans: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'] 
  },
  employees: { 
    view: ['owner', 'manager'], 
    create: ['owner', 'manager'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'] 
  },
  attendance: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'] 
  },
  salary: { 
    view: ['owner', 'accounts'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
  leave: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'] 
  },
  tasks: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'] 
  },
  reports: { 
    view: ['owner', 'manager'], 
    create: ['owner', 'manager'], 
    edit: [], 
    delete: [] 
  },
  settings: { 
    view: ['owner', 'manager'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
  team_members: { 
    view: ['owner', 'manager'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
  billing: { 
    view: ['owner'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
};

interface AccessCheckRequest {
  feature?: string;
  module?: string;
  action?: string;
  organizationId: string;
  isImpersonating?: boolean;
}

interface AccessCheckResponse {
  hasAccess: boolean;
  isSuperAdmin?: boolean;
  isImpersonating?: boolean;
  orgRole?: string;
  plan?: string;
  blockedByPlan?: boolean;
  blockedByRole?: boolean;
  requiredPlan?: string;
  error?: string;
  message?: string;
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

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', hasAccess: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const { feature, module, action = 'view', organizationId, isImpersonating }: AccessCheckRequest = await req.json();

    // Step 1: Check if user is super_admin (system-level role)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const isSuperAdmin = roleData?.role === 'super_admin';

    // Super Admin Logic:
    // - If impersonating, allow access to org operations
    // - If NOT impersonating, only allow system-level operations
    if (isSuperAdmin && !isImpersonating) {
      // Super admin without impersonation can only access system-level features
      // They should NOT be able to perform org-level operations directly
      return new Response(
        JSON.stringify({ 
          hasAccess: true, 
          isSuperAdmin: true,
          message: 'Super admin access (system level only)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: For organization-level access, check membership
    // CRITICAL: This is the SINGLE SOURCE OF TRUTH for org role
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error fetching membership:', membershipError);
    }

    // If super admin is impersonating, use synthetic owner role
    // Otherwise, use the role from organization_members (SINGLE SOURCE OF TRUTH)
    const orgRole = isSuperAdmin && isImpersonating ? 'owner' : membership?.role;

    // Log role resolution for debugging
    console.log(`Role resolution: userId=${userId}, orgId=${organizationId}, isSuperAdmin=${isSuperAdmin}, isImpersonating=${isImpersonating}, resolvedRole=${orgRole}`);

    if (!orgRole && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ 
          error: 'Not a member of this organization', 
          hasAccess: false,
          blockedByRole: true,
          message: 'You are not a member of this organization.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Check subscription status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const isTrialExpired = subscription?.status === 'expired' || 
      (subscription?.status === 'trial' && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date());
    
    const isSubscriptionActive = subscription?.status === 'active' || 
      (subscription?.status === 'trial' && !isTrialExpired);

    // Block write operations if subscription is not active
    if (!isSubscriptionActive && action !== 'view') {
      return new Response(
        JSON.stringify({ 
          error: 'Subscription expired', 
          hasAccess: false,
          blockedByPlan: true,
          message: 'Your subscription has expired. Please renew to continue.'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Check plan feature if specified
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

    // Step 5: Check module permission if specified
    if (module && orgRole) {
      const modulePerms = ORG_PERMISSION_MATRIX[module];
      if (modulePerms) {
        const allowedRoles = modulePerms[action] || [];
        if (!allowedRoles.includes(orgRole)) {
          return new Response(
            JSON.stringify({ 
              error: 'Permission denied', 
              hasAccess: false,
              blockedByRole: true,
              message: `You don't have permission to ${action} ${module.replace('_', ' ')}.`
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Success response
    const response: AccessCheckResponse = {
      hasAccess: true,
      orgRole,
      plan: subscription?.plan,
    };

    if (isSuperAdmin && isImpersonating) {
      response.isSuperAdmin = true;
      response.isImpersonating = true;
    }

    return new Response(
      JSON.stringify(response),
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
