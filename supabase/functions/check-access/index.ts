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
 * 2. Organization Roles (owner, admin, staff, viewer) - Stored in organization_members table
 *    - Apply ONLY within their organization context
 */

// Organization role hierarchy
const ORG_ROLE_HIERARCHY: Record<string, number> = {
  owner: 100,
  admin: 75,
  staff: 50,
  viewer: 25,
};

// Plan features configuration
const planFeatures: Record<string, string[]> = {
  free: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data'],
  basic: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports'],
  pro: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support'],
  enterprise: ['multi_user', 'team_management', 'notifications', 'delivery_challans', 'export_data', 'reports', 'analytics', 'audit_logs', 'advanced_invoicing', 'bulk_operations', 'priority_support', 'api_access', 'custom_branding', 'white_label'],
};

// Organization permission matrix - single source of truth for server-side enforcement
const ORG_PERMISSION_MATRIX: Record<string, Record<string, string[]>> = {
  dashboard: { view: ['owner', 'admin', 'staff', 'viewer'], create: [], edit: [], delete: [] },
  customers: { 
    view: ['owner', 'admin', 'staff', 'viewer'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin', 'staff'], 
    delete: ['owner', 'admin'] 
  },
  invoices: { 
    view: ['owner', 'admin', 'staff', 'viewer'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin', 'staff'], 
    delete: ['owner'] 
  },
  quotations: { 
    view: ['owner', 'admin', 'staff', 'viewer'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin', 'staff'], 
    delete: ['owner', 'admin'] 
  },
  expenses: { 
    view: ['owner', 'admin', 'staff'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin'], 
    delete: ['owner'] 
  },
  vendors: { 
    view: ['owner', 'admin', 'staff'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin'], 
    delete: ['owner'] 
  },
  delivery_challans: { 
    view: ['owner', 'admin', 'staff', 'viewer'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin', 'staff'], 
    delete: ['owner', 'admin'] 
  },
  employees: { 
    view: ['owner', 'admin'], 
    create: ['owner', 'admin'], 
    edit: ['owner', 'admin'], 
    delete: ['owner'] 
  },
  attendance: { 
    view: ['owner', 'admin', 'staff'], 
    create: ['owner', 'admin'], 
    edit: ['owner', 'admin'], 
    delete: ['owner'] 
  },
  salary: { 
    view: ['owner', 'admin'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
  leave: { 
    view: ['owner', 'admin', 'staff'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin'], 
    delete: ['owner'] 
  },
  tasks: { 
    view: ['owner', 'admin', 'staff'], 
    create: ['owner', 'admin', 'staff'], 
    edit: ['owner', 'admin', 'staff'], 
    delete: ['owner', 'admin'] 
  },
  reports: { 
    view: ['owner', 'admin'], 
    create: ['owner', 'admin'], 
    edit: [], 
    delete: [] 
  },
  settings: { 
    view: ['owner', 'admin'], 
    create: ['owner'], 
    edit: ['owner'], 
    delete: ['owner'] 
  },
  team_members: { 
    view: ['owner', 'admin'], 
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
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    // If super admin is impersonating, use synthetic owner role
    const orgRole = isSuperAdmin && isImpersonating ? 'owner' : membership?.role;

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
