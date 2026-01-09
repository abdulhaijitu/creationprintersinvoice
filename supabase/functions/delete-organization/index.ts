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

    // Count business data for logging
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (hardDelete) {
      // Hard delete - CASCADE DELETE all related data
      console.log(`Performing HARD DELETE with cascade. Data to delete: ${invoiceCount || 0} invoices, ${customerCount || 0} customers`);
      
      // Delete in order of dependencies (child tables first)
      
      // 1. Delete delivery challan items first (references delivery_challans and invoice_items)
      const { error: challanItemsError } = await supabase
        .from('delivery_challan_items')
        .delete()
        .eq('organization_id', organizationId);
      if (challanItemsError) console.warn('Error deleting delivery_challan_items:', challanItemsError);
      
      // 2. Delete delivery challans (references invoices)
      const { error: challansError } = await supabase
        .from('delivery_challans')
        .delete()
        .eq('organization_id', organizationId);
      if (challansError) console.warn('Error deleting delivery_challans:', challansError);
      
      // 3. Delete invoice payments (references invoices)
      const { error: paymentsError } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('organization_id', organizationId);
      if (paymentsError) console.warn('Error deleting invoice_payments:', paymentsError);
      
      // 4. Delete invoice items (references invoices)
      const { error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('organization_id', organizationId);
      if (invoiceItemsError) console.warn('Error deleting invoice_items:', invoiceItemsError);
      
      // 5. Delete quotation items (references quotations)
      const { error: quotationItemsError } = await supabase
        .from('quotation_items')
        .delete()
        .eq('organization_id', organizationId);
      if (quotationItemsError) console.warn('Error deleting quotation_items:', quotationItemsError);
      
      // 6. Delete invoices (may reference quotations, customers)
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('organization_id', organizationId);
      if (invoicesError) console.warn('Error deleting invoices:', invoicesError);
      
      // 7. Delete quotations (references customers)
      const { error: quotationsError } = await supabase
        .from('quotations')
        .delete()
        .eq('organization_id', organizationId);
      if (quotationsError) console.warn('Error deleting quotations:', quotationsError);
      
      // 8. Delete vendor bill payments (references vendor_bills)
      const { error: vendorPaymentsError } = await supabase
        .from('vendor_bill_payments')
        .delete()
        .eq('organization_id', organizationId);
      if (vendorPaymentsError) console.warn('Error deleting vendor_bill_payments:', vendorPaymentsError);
      
      // 9. Delete expenses (references vendor_bills, vendors)
      const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .eq('organization_id', organizationId);
      if (expensesError) console.warn('Error deleting expenses:', expensesError);
      
      // 10. Delete vendor bills (references vendors)
      const { error: vendorBillsError } = await supabase
        .from('vendor_bills')
        .delete()
        .eq('organization_id', organizationId);
      if (vendorBillsError) console.warn('Error deleting vendor_bills:', vendorBillsError);
      
      // 11. Delete customers
      const { error: customersError } = await supabase
        .from('customers')
        .delete()
        .eq('organization_id', organizationId);
      if (customersError) console.warn('Error deleting customers:', customersError);
      
      // 12. Delete vendors
      const { error: vendorsError } = await supabase
        .from('vendors')
        .delete()
        .eq('organization_id', organizationId);
      if (vendorsError) console.warn('Error deleting vendors:', vendorsError);
      
      // 13. Delete expense categories
      const { error: expCatError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('organization_id', organizationId);
      if (expCatError) console.warn('Error deleting expense_categories:', expCatError);
      
      // 14. Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('organization_id', organizationId);
      if (tasksError) console.warn('Error deleting tasks:', tasksError);
      
      // 15. Delete employee-related data
      const { error: empSalaryError } = await supabase
        .from('employee_salary_records')
        .delete()
        .eq('organization_id', organizationId);
      if (empSalaryError) console.warn('Error deleting employee_salary_records:', empSalaryError);
      
      const { error: empAdvanceError } = await supabase
        .from('employee_advances')
        .delete()
        .eq('organization_id', organizationId);
      if (empAdvanceError) console.warn('Error deleting employee_advances:', empAdvanceError);
      
      const { error: empAttendError } = await supabase
        .from('employee_attendance')
        .delete()
        .eq('organization_id', organizationId);
      if (empAttendError) console.warn('Error deleting employee_attendance:', empAttendError);
      
      const { error: employeesError } = await supabase
        .from('employees')
        .delete()
        .eq('organization_id', organizationId);
      if (employeesError) console.warn('Error deleting employees:', employeesError);
      
      // 16. Delete other org-related data
      const { error: notifError } = await supabase
        .from('notifications')
        .delete()
        .eq('organization_id', organizationId);
      if (notifError) console.warn('Error deleting notifications:', notifError);
      
      const { error: notifLogError } = await supabase
        .from('notification_logs')
        .delete()
        .eq('organization_id', organizationId);
      if (notifLogError) console.warn('Error deleting notification_logs:', notifLogError);
      
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .eq('organization_id', organizationId);
      if (auditError) console.warn('Error deleting audit_logs:', auditError);
      
      const { error: attendError } = await supabase
        .from('attendance')
        .delete()
        .eq('organization_id', organizationId);
      if (attendError) console.warn('Error deleting attendance:', attendError);
      
      const { error: leaveReqError } = await supabase
        .from('leave_requests')
        .delete()
        .eq('organization_id', organizationId);
      if (leaveReqError) console.warn('Error deleting leave_requests:', leaveReqError);
      
      const { error: leaveBalError } = await supabase
        .from('leave_balances')
        .delete()
        .eq('organization_id', organizationId);
      if (leaveBalError) console.warn('Error deleting leave_balances:', leaveBalError);
      
      const { error: onboardProgressError } = await supabase
        .from('onboarding_progress')
        .delete()
        .eq('organization_id', organizationId);
      if (onboardProgressError) console.warn('Error deleting onboarding_progress:', onboardProgressError);
      
      const { error: onboardAnalyticsError } = await supabase
        .from('onboarding_analytics')
        .delete()
        .eq('organization_id', organizationId);
      if (onboardAnalyticsError) console.warn('Error deleting onboarding_analytics:', onboardAnalyticsError);
      
      const { error: demoDataError } = await supabase
        .from('demo_data_records')
        .delete()
        .eq('organization_id', organizationId);
      if (demoDataError) console.warn('Error deleting demo_data_records:', demoDataError);
      
      const { error: demoCleanupError } = await supabase
        .from('demo_cleanup_logs')
        .delete()
        .eq('organization_id', organizationId);
      if (demoCleanupError) console.warn('Error deleting demo_cleanup_logs:', demoCleanupError);
      
      const { error: invoiceSeqError } = await supabase
        .from('invoice_sequences')
        .delete()
        .eq('organization_id', organizationId);
      if (invoiceSeqError) console.warn('Error deleting invoice_sequences:', invoiceSeqError);
      
      const { error: billingInvError } = await supabase
        .from('billing_invoices')
        .delete()
        .eq('organization_id', organizationId);
      if (billingInvError) console.warn('Error deleting billing_invoices:', billingInvError);
      
      // 17. Delete org-specific permissions and settings
      const { error: orgPermError } = await supabase
        .from('org_specific_permissions')
        .delete()
        .eq('organization_id', organizationId);
      if (orgPermError) console.warn('Error deleting org_specific_permissions:', orgPermError);
      
      const { error: orgPermSettingsError } = await supabase
        .from('org_permission_settings')
        .delete()
        .eq('organization_id', organizationId);
      if (orgPermSettingsError) console.warn('Error deleting org_permission_settings:', orgPermSettingsError);
      
      const { error: orgBrandingError } = await supabase
        .from('organization_branding')
        .delete()
        .eq('organization_id', organizationId);
      if (orgBrandingError) console.warn('Error deleting organization_branding:', orgBrandingError);
      
      const { error: orgEmailBrandingError } = await supabase
        .from('organization_email_branding')
        .delete()
        .eq('organization_id', organizationId);
      if (orgEmailBrandingError) console.warn('Error deleting organization_email_branding:', orgEmailBrandingError);
      
      const { error: orgDomainsError } = await supabase
        .from('organization_domains')
        .delete()
        .eq('organization_id', organizationId);
      if (orgDomainsError) console.warn('Error deleting organization_domains:', orgDomainsError);
      
      // 18. Delete organization members
      const { error: membersError } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId);
      if (membersError) console.warn('Error deleting organization_members:', membersError);

      // 19. Delete subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('organization_id', organizationId);
      if (subError) console.warn('Error deleting subscriptions:', subError);

      // 20. Finally delete the organization
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
      
      console.log(`Hard delete completed for organization ${organizationId}`);
      
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
    }

    // Log audit (only if not hard delete, since audit logs are deleted for hard delete)
    if (!hardDelete) {
      try {
        await supabase.rpc('insert_audit_log', {
          p_actor_id: user.id,
          p_actor_email: user.email,
          p_actor_role: 'super_admin',
          p_actor_type: 'admin',
          p_action_type: 'delete',
          p_action_label: 'Organization soft deleted (cancelled)',
          p_entity_type: 'organization',
          p_entity_id: organizationId,
          p_entity_name: currentOrg.name,
          p_organization_id: organizationId,
          p_organization_name: currentOrg.name,
          p_source: 'admin_console',
          p_metadata: { 
            hard_delete: false,
            member_count: memberCount || 0,
            owner_email: currentOrg.owner_email,
            invoice_count: invoiceCount || 0,
            customer_count: customerCount || 0
          },
          p_before_state: currentOrg,
          p_after_state: null
        });
      } catch (auditError) {
        console.warn('Failed to log audit:', auditError);
      }
    }

    console.log(`Successfully ${hardDelete ? 'HARD deleted' : 'soft-deleted'} organization ${organizationId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: hardDelete 
          ? `Organization permanently deleted (including ${invoiceCount || 0} invoices, ${customerCount || 0} customers)` 
          : 'Organization has been deactivated (soft deleted)',
        hardDelete,
        deletedData: hardDelete ? {
          invoices: invoiceCount || 0,
          customers: customerCount || 0,
          members: memberCount || 0
        } : null
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
