import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ROLE RESOLUTION EDGE FUNCTION
 * 
 * This is the SINGLE SOURCE OF TRUTH for role resolution.
 * Frontend MUST NOT cache or guess roles - always fetch fresh from this endpoint.
 * 
 * ARCHITECTURE:
 * 1. System Role (super_admin) - Platform-level, stored in user_roles table
 * 2. Organization Roles (owner, manager, accounts, staff) - Per-org, in organization_members table
 */

interface RoleResolutionRequest {
  organizationId?: string;
  isImpersonating?: boolean;
  impersonationTarget?: {
    organizationId: string;
    ownerId: string;
  };
}

interface RoleResolutionResponse {
  success: boolean;
  userId: string;
  systemRole: 'super_admin' | null;
  isSuperAdmin: boolean;
  orgRole: 'owner' | 'manager' | 'accounts' | 'staff' | null;
  organizationId: string | null;
  isImpersonating: boolean;
  effectiveRole: 'owner' | 'manager' | 'accounts' | 'staff' | null;
  membership?: {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
  } | null;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, isImpersonating, impersonationTarget }: RoleResolutionRequest = await req.json();

    // Step 1: Check system role (super_admin)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isSuperAdmin = roleData?.role === 'super_admin';
    const systemRole = isSuperAdmin ? 'super_admin' : null;

    // Step 2: Handle impersonation (Super Admin only)
    if (isSuperAdmin && isImpersonating && impersonationTarget) {
      // Validate impersonation target exists
      const { data: targetOrg, error: orgError } = await supabase
        .from('organizations')
        .select('id, owner_id')
        .eq('id', impersonationTarget.organizationId)
        .single();

      if (orgError || !targetOrg) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Impersonation target organization not found' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Super Admin impersonating gets owner role for the target org
      const response: RoleResolutionResponse = {
        success: true,
        userId: user.id,
        systemRole,
        isSuperAdmin: true,
        orgRole: 'owner', // Impersonation grants owner access
        organizationId: impersonationTarget.organizationId,
        isImpersonating: true,
        effectiveRole: 'owner',
        membership: {
          id: 'impersonation-synthetic',
          organization_id: impersonationTarget.organizationId,
          user_id: impersonationTarget.ownerId,
          role: 'owner',
        },
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get organization membership for regular users (or super admin without impersonation)
    if (!organizationId) {
      // No organization specified - return system role only
      const response: RoleResolutionResponse = {
        success: true,
        userId: user.id,
        systemRole,
        isSuperAdmin,
        orgRole: null,
        organizationId: null,
        isImpersonating: false,
        effectiveRole: null,
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 4: Fetch membership from organization_members table (SINGLE SOURCE OF TRUTH)
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single();

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error fetching membership:', membershipError);
    }

    const orgRole = membership?.role as RoleResolutionResponse['orgRole'] || null;

    // Step 5: Validate owner integrity
    // If user is marked as owner in organization_members, verify against organizations.owner_id
    if (orgRole === 'owner') {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('owner_id')
        .eq('id', organizationId)
        .single();

      // If there's a mismatch, log warning but trust organization_members as source of truth
      if (orgData && orgData.owner_id !== user.id) {
        console.warn(`Owner mismatch: organization.owner_id=${orgData.owner_id}, membership user_id=${user.id}`);
        // In production, this should trigger an alert/audit log
      }
    }

    const response: RoleResolutionResponse = {
      success: true,
      userId: user.id,
      systemRole,
      isSuperAdmin,
      orgRole,
      organizationId,
      isImpersonating: false,
      effectiveRole: orgRole,
      membership: membership || null,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in resolve-role:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
