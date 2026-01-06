import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteOrganizationRequest {
  organizationId: string;
  hardDelete?: boolean; // If true, permanently delete. Default is soft delete.
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
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
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
        JSON.stringify({ success: false, error: 'Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, hardDelete = false }: DeleteOrganizationRequest = await req.json();
    
    if (!organizationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing organization delete for ${organizationId} by ${user.email}, hardDelete: ${hardDelete}`);

    // Get current organization
    const { data: currentOrg, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, owner_id, owner_email')
      .eq('id', organizationId)
      .single();

    if (orgError || !currentOrg) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // If hard delete, check if safe to delete
    if (hardDelete) {
      // Check for important data
      const { count: invoiceCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if ((invoiceCount || 0) > 0 || (customerCount || 0) > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Cannot permanently delete organization with existing data. Found ${invoiceCount || 0} invoices and ${customerCount || 0} customers. Use soft delete instead.` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hard delete - remove all related data first
      console.log('Performing hard delete...');
      
      // Delete organization members
      await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId);

      // Delete subscription
      await supabase
        .from('subscriptions')
        .delete()
        .eq('organization_id', organizationId);

      // Delete organization
      const { error: deleteError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (deleteError) {
        throw new Error(`Failed to delete organization: ${deleteError.message}`);
      }

      // Delete owner user if exists
      if (currentOrg.owner_id) {
        try {
          await supabase.auth.admin.deleteUser(currentOrg.owner_id);
          console.log(`Deleted owner user: ${currentOrg.owner_id}`);
        } catch (e) {
          console.warn('Could not delete owner user:', e);
        }
      }
    } else {
      // Soft delete - mark subscription as cancelled/deleted
      console.log('Performing soft delete (marking as deleted)...');
      
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId);

      if (subError) {
        console.warn('Failed to update subscription status:', subError);
      }

      // Update organization name to indicate deletion (optional marker)
      // We don't actually delete the data
    }

    // Log audit
    try {
      await supabase.rpc('insert_audit_log', {
        p_actor_id: user.id,
        p_actor_email: user.email,
        p_actor_role: 'super_admin',
        p_actor_type: 'admin',
        p_action_type: 'delete',
        p_action_label: hardDelete ? 'Organization permanently deleted' : 'Organization soft deleted (cancelled)',
        p_entity_type: 'organization',
        p_entity_id: organizationId,
        p_entity_name: currentOrg.name,
        p_organization_id: organizationId,
        p_organization_name: currentOrg.name,
        p_source: 'admin_console',
        p_metadata: { 
          hard_delete: hardDelete,
          member_count: memberCount || 0,
          owner_email: currentOrg.owner_email
        },
        p_before_state: currentOrg,
        p_after_state: null
      });
    } catch (auditError) {
      console.warn('Failed to log audit:', auditError);
    }

    console.log(`Successfully ${hardDelete ? 'deleted' : 'soft-deleted'} organization ${organizationId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: hardDelete 
          ? 'Organization permanently deleted' 
          : 'Organization has been deactivated (soft deleted)',
        hardDelete
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in delete-organization:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
