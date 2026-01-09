import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, action } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'migrate') {
      // Get organization's invoice sequence settings
      const { data: sequenceData } = await supabase
        .from('invoice_sequences')
        .select('prefix, starting_number')
        .eq('organization_id', organization_id)
        .single();

      const prefix = sequenceData?.prefix || 'INV-';
      const startingNumber = sequenceData?.starting_number || 1;

      // Fetch all invoices for this organization ordered by creation date
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at')
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch invoices: ${fetchError.message}`);
      }

      if (!invoices || invoices.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'No invoices to migrate',
            migrated_count: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Migrate each invoice with new sequential numbers
      let currentNumber = startingNumber;
      const updates = [];

      for (const invoice of invoices) {
        const newInvoiceNumber = `${prefix}${currentNumber.toString().padStart(4, '0')}`;
        
        updates.push({
          id: invoice.id,
          invoice_number: newInvoiceNumber,
          invoice_no_raw: currentNumber
        });

        currentNumber++;
      }

      // Batch update invoices
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({
            invoice_number: update.invoice_number,
            invoice_no_raw: update.invoice_no_raw
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Failed to update invoice ${update.id}:`, updateError);
        }
      }

      // Update the sequence to reflect the last used number
      const lastNumber = currentNumber - 1;
      await supabase
        .from('invoice_sequences')
        .upsert({
          organization_id,
          current_sequence: lastNumber,
          prefix,
          starting_number: startingNumber,
          last_migration_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization_id' });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully migrated ${updates.length} invoices`,
          migrated_count: updates.length,
          last_number: lastNumber,
          sample_format: `${prefix}${lastNumber.toString().padStart(4, '0')}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'preview') {
      // Preview what the migration would look like
      const { data: sequenceData } = await supabase
        .from('invoice_sequences')
        .select('prefix, starting_number')
        .eq('organization_id', organization_id)
        .single();

      const prefix = sequenceData?.prefix || 'INV-';
      const startingNumber = sequenceData?.starting_number || 1;

      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id);

      const invoiceCount = count || 0;
      const lastNumber = startingNumber + invoiceCount - 1;

      return new Response(
        JSON.stringify({
          success: true,
          invoice_count: invoiceCount,
          first_invoice: invoiceCount > 0 ? `${prefix}${startingNumber.toString().padStart(4, '0')}` : null,
          last_invoice: invoiceCount > 0 ? `${prefix}${lastNumber.toString().padStart(4, '0')}` : null,
          next_invoice: `${prefix}${(lastNumber + 1).toString().padStart(4, '0')}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "migrate" or "preview"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
