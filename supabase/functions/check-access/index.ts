import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * EDGE-ENFORCED PERMISSION CHECK
 * 
 * This is the AUTHORITATIVE permission check for all operations.
 * Frontend checks are UX-only - this function enforces actual security.
 * 
 * ROLE SYSTEM:
 * 1. System Role (super_admin) - Platform-level, stored in user_roles table
 * 2. Organization Roles (owner, manager, accounts, staff) - Per-org, in organization_members table
 */

// Organization role hierarchy - MUST match frontend constants
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

/**
 * EDGE-ENFORCED PERMISSION MATRIX
 * This MUST be the single source of truth for permissions.
 * Frontend permission matrix must mirror this exactly.
 */
const PERMISSION_MATRIX: Record<string, Record<string, string[]>> = {
  dashboard: { 
    view: ['owner', 'manager', 'accounts', 'staff'] 
  },
  customers: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  invoices: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'accounts', 'staff'], 
    edit: ['owner', 'manager', 'accounts', 'staff'], 
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  quotations: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  expenses: { 
    view: ['owner', 'manager', 'accounts'], 
    create: ['owner', 'manager', 'accounts'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  vendors: { 
    view: ['owner', 'manager', 'accounts'], 
    create: ['owner', 'manager', 'accounts'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  delivery_challans: { 
    view: ['owner', 'manager', 'accounts', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  employees: { 
    view: ['owner', 'manager'], 
    create: ['owner', 'manager'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'],
    bulk: ['owner'],
    import: ['owner'],
    export: ['owner', 'manager'],
  },
  attendance: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'],
    bulk: ['owner'],
    export: ['owner', 'manager'],
  },
  salary: { 
    view: ['owner', 'accounts'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'],
    export: ['owner'],
  },
  leave: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager'], 
    delete: ['owner'],
  },
  tasks: { 
    view: ['owner', 'manager', 'staff'], 
    create: ['owner', 'manager', 'staff'], 
    edit: ['owner', 'manager', 'staff'], 
    delete: ['owner', 'manager'],
  },
  reports: { 
    view: ['owner', 'manager'], 
    export: ['owner', 'manager'],
  },
  settings: { 
    view: ['owner', 'manager'], 
    edit: ['owner'],
  },
  team_members: { 
    view: ['owner', 'manager'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'],
  },
  billing: { 
    view: ['owner'], 
    edit: ['owner'],
  },
  white_label: { 
    view: ['owner'], 
    edit: ['owner'],
  },
  analytics: { 
    view: ['owner', 'manager'], 
    export: ['owner', 'manager'],
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
    // - Super admin can ONLY perform system-level operations
    // - They CANNOT perform org-level operations unless impersonating
    // - When impersonating, they get 'owner' role for that org
    if (isSuperAdmin && !isImpersonating) {
      // Super admin without impersonation - only system-level access
      // Block org-level operations (like invoice create/edit/delete)
      if (module && PERMISSION_MATRIX[module]) {
        console.log(`Super admin blocked from org operation: ${module}/${action} without impersonation`);
        return new Response(
          JSON.stringify({ 
            hasAccess: false, 
            isSuperAdmin: true,
            blockedByRole: true,
            message: 'Super admins must impersonate to perform organization operations'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Allow system-level operations
      return new Response(
        JSON.stringify({ 
          hasAccess: true, 
          isSuperAdmin: true,
          message: 'Super admin access (system level only)'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get organization membership (SINGLE SOURCE OF TRUTH for org role)
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

    // Log for debugging
    console.log(`[check-access] userId=${userId}, orgId=${organizationId}, module=${module}, action=${action}, isSuperAdmin=${isSuperAdmin}, isImpersonating=${isImpersonating}, resolvedRole=${orgRole}`);

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
      const modulePerms = PERMISSION_MATRIX[module];
      if (modulePerms) {
        const allowedRoles = modulePerms[action] || [];
        if (!allowedRoles.includes(orgRole)) {
          console.log(`[check-access] DENIED: role=${orgRole} cannot ${action} on ${module}. Allowed: ${allowedRoles.join(', ')}`);
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
