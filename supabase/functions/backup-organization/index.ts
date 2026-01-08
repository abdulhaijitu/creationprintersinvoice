import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BACKUP_TABLES = [
  'customers',
  'invoices',
  'invoice_items',
  'invoice_payments',
  'quotations',
  'quotation_items',
  'expenses',
  'expense_categories',
  'employees',
  'employee_attendance',
  'employee_advances',
  'employee_salary_records',
  'delivery_challans',
  'delivery_challan_items',
  'vendors',
  'vendor_bills',
];

interface BackupRequest {
  organization_id: string;
  include_metadata?: boolean;
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

    const body: BackupRequest = await req.json();
    const { organization_id, include_metadata = true } = body;

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client for data operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is owner/manager of the organization
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .single();

    if (memberError || !membership || !['owner', 'manager'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Only organization owners/managers can create backups' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect backup data
    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const table of BACKUP_TABLES) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .eq('organization_id', organization_id);

        if (error) {
          errors.push(`Error fetching ${table}: ${error.message}`);
          continue;
        }

        backupData[table] = data || [];
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to backup ${table}: ${errMsg}`);
      }
    }

    // Get organization metadata
    let metadata = null;
    if (include_metadata) {
      const { data: orgData } = await supabaseAdmin
        .from('organizations')
        .select('name, slug, address, phone, email, website, tax_rate, invoice_prefix, quotation_prefix, challan_prefix, invoice_terms, invoice_footer')
        .eq('id', organization_id)
        .single();
      
      metadata = orgData;
    }

    const backup = {
      version: '1.0',
      created_at: new Date().toISOString(),
      created_by: user.email,
      organization_id,
      metadata,
      tables: backupData,
      record_counts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]) => [k, v.length])
      ),
      errors: errors.length > 0 ? errors : undefined,
    };

    // Log the backup action
    await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: user.email,
      p_actor_role: membership.role,
      p_action_type: 'export',
      p_action_label: 'Created organization backup',
      p_entity_type: 'backup',
      p_entity_name: `Backup ${new Date().toISOString().split('T')[0]}`,
      p_organization_id: organization_id,
      p_source: 'edge_function',
      p_metadata: { 
        record_counts: backup.record_counts,
        tables_backed_up: Object.keys(backupData).length,
      },
    });

    console.log(`Backup created for org ${organization_id}: ${Object.keys(backupData).length} tables`);

    return new Response(
      JSON.stringify(backup),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="backup-${organization_id}-${new Date().toISOString().split('T')[0]}.json"`,
        } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in backup-organization:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
