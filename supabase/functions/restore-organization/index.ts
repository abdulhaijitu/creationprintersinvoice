import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Order matters for foreign key constraints
const RESTORE_ORDER = [
  'customers',
  'expense_categories',
  'vendors',
  'employees',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'quotations',
  'quotation_items',
  'expenses',
  'vendor_bills',
  'employee_attendance',
  'employee_advances',
  'employee_salary_records',
  'delivery_challans',
  'delivery_challan_items',
];

interface RestoreRequest {
  organization_id: string;
  backup_data: {
    version: string;
    organization_id: string;
    tables: Record<string, unknown[]>;
  };
  mode: 'merge' | 'replace';
  confirm: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client for user auth
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RestoreRequest = await req.json();
    const { organization_id, backup_data, mode = 'merge', confirm } = body;

    if (!organization_id || !backup_data) {
      return new Response(
        JSON.stringify({ error: 'organization_id and backup_data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!confirm) {
      return new Response(
        JSON.stringify({ error: 'Confirmation required. Set confirm: true to proceed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate backup structure
    if (!backup_data.version || !backup_data.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent cross-org restore
    if (backup_data.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot restore backup from a different organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for data operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is owner of the organization
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only organization owners can restore backups' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, { restored: number; errors: string[] }> = {};

    // If replace mode, delete existing data first (in reverse order for FK constraints)
    if (mode === 'replace') {
      const deleteOrder = [...RESTORE_ORDER].reverse();
      for (const table of deleteOrder) {
        try {
          await supabaseAdmin
            .from(table)
            .delete()
            .eq('organization_id', organization_id);
        } catch (err) {
          console.log(`Note: Could not clear ${table} - may be empty or have constraints`);
        }
      }
    }

    // Restore data in correct order
    for (const table of RESTORE_ORDER) {
      const tableData = backup_data.tables[table];
      if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
        results[table] = { restored: 0, errors: [] };
        continue;
      }

      const tableResult = { restored: 0, errors: [] as string[] };

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < tableData.length; i += batchSize) {
        const batch = tableData.slice(i, i + batchSize);
        
        try {
          // Ensure organization_id is set correctly
          const preparedBatch = batch.map((record: Record<string, unknown>) => ({
            ...record,
            organization_id,
          }));

          const { error } = await supabaseAdmin
            .from(table)
            .upsert(preparedBatch, { 
              onConflict: 'id',
              ignoreDuplicates: mode === 'merge',
            });

          if (error) {
            tableResult.errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
          } else {
            tableResult.restored += batch.length;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          tableResult.errors.push(`Batch ${i}-${i + batch.length}: ${errMsg}`);
        }
      }

      results[table] = tableResult;
    }

    const totalRestored = Object.values(results).reduce((sum, r) => sum + r.restored, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0);

    // Log the restore action
    await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: user.email,
      p_actor_role: membership.role,
      p_action_type: 'import',
      p_action_label: `Restored organization backup (${mode} mode)`,
      p_entity_type: 'backup',
      p_entity_name: `Restore ${new Date().toISOString().split('T')[0]}`,
      p_organization_id: organization_id,
      p_source: 'edge_function',
      p_metadata: { 
        mode,
        total_restored: totalRestored,
        total_errors: totalErrors,
        backup_version: backup_data.version,
      },
    });

    console.log(`Restore completed for org ${organization_id}: ${totalRestored} records, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true,
        summary: { totalRestored, totalErrors },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in restore-organization:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
