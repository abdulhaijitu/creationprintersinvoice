import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkDeleteResult {
  softDeleted: string[];
  hardDeleted: string[];
  failed: { id: string; reason: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify auth
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerIds } = await req.json();

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No customer IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization membership to verify access
    const { data: membership } = await supabaseClient
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'User not in any organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: BulkDeleteResult = {
      softDeleted: [],
      hardDeleted: [],
      failed: [],
    };

    for (const customerId of customerIds) {
      try {
        // Verify customer belongs to user's organization
        const { data: customer } = await supabaseClient
          .from('customers')
          .select('id, name, organization_id')
          .eq('id', customerId)
          .eq('organization_id', membership.organization_id)
          .single();

        if (!customer) {
          result.failed.push({ id: customerId, reason: 'Customer not found or access denied' });
          continue;
        }

        // Check for linked invoices
        const { count: invoiceCount } = await supabaseClient
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId);

        // Check for linked delivery challans
        const { count: challanCount } = await supabaseClient
          .from('delivery_challans')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId);

        const hasLinkedRecords = (invoiceCount || 0) > 0 || (challanCount || 0) > 0;

        if (hasLinkedRecords) {
          // Soft delete - mark as deleted
          const { error: updateError } = await supabaseClient
            .from('customers')
            .update({ 
              is_deleted: true, 
              deleted_at: new Date().toISOString() 
            })
            .eq('id', customerId);

          if (updateError) {
            result.failed.push({ id: customerId, reason: updateError.message });
          } else {
            result.softDeleted.push(customerId);
          }
        } else {
          // Hard delete - no linked records
          const { error: deleteError } = await supabaseClient
            .from('customers')
            .delete()
            .eq('id', customerId);

          if (deleteError) {
            result.failed.push({ id: customerId, reason: deleteError.message });
          } else {
            result.hardDeleted.push(customerId);
          }
        }
      } catch (err) {
        result.failed.push({ 
          id: customerId, 
          reason: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        summary: {
          archived: result.softDeleted.length,
          deleted: result.hardDeleted.length,
          failed: result.failed.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk delete error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
