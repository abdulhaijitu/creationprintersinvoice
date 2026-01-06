import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PermissionUpdate {
  permissionId: string;
  isEnabled: boolean;
}

interface RequestBody {
  updates: PermissionUpdate[];
  adminEmail?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { updates, adminEmail } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No updates provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const update of updates) {
      try {
        // Get the permission to check if it's protected
        const { data: perm, error: fetchError } = await supabase
          .from('org_role_permissions')
          .select('*')
          .eq('id', update.permissionId)
          .single();

        if (fetchError || !perm) {
          results.push({ id: update.permissionId, success: false, error: 'Permission not found' });
          continue;
        }

        // Prevent disabling protected permissions
        if (perm.is_protected && perm.is_enabled && !update.isEnabled) {
          results.push({ id: update.permissionId, success: false, error: 'Cannot disable protected permission' });
          continue;
        }

        // Update the permission
        const { error: updateError } = await supabase
          .from('org_role_permissions')
          .update({ is_enabled: update.isEnabled })
          .eq('id', update.permissionId);

        if (updateError) {
          results.push({ id: update.permissionId, success: false, error: updateError.message });
          continue;
        }

        // Log audit event
        await supabase.from('enhanced_audit_logs').insert({
          actor_id: user.id,
          actor_email: adminEmail || user.email,
          actor_role: 'super_admin',
          actor_type: 'admin',
          action_type: 'update',
          action_label: `Permission ${update.isEnabled ? 'enabled' : 'disabled'}: ${perm.permission_label}`,
          entity_type: 'org_role_permission',
          entity_id: perm.id,
          entity_name: `${perm.role}:${perm.permission_key}`,
          source: 'admin',
          metadata: {
            role: perm.role,
            permission_key: perm.permission_key,
            previous_value: perm.is_enabled,
            new_value: update.isEnabled,
          },
        });

        results.push({ id: update.permissionId, success: true });
      } catch (err) {
        results.push({ id: update.permissionId, success: false, error: String(err) });
      }
    }

    const allSuccess = results.every(r => r.success);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: allSuccess,
        message: `${successCount}/${updates.length} permissions updated`,
        results,
      }),
      { 
        status: allSuccess ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in update-role-permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
