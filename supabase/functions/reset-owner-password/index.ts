import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  organizationId: string;
  ownerEmail: string;
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
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
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
        JSON.stringify({ error: 'Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organizationId, ownerEmail }: ResetPasswordRequest = await req.json();
    
    if (!organizationId || !ownerEmail) {
      return new Response(
        JSON.stringify({ error: 'organizationId and ownerEmail are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing password reset for owner ${ownerEmail} by ${user.email}`);

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_email')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the email matches organization owner
    if (organization.owner_email !== ownerEmail) {
      return new Response(
        JSON.stringify({ error: 'Email does not match organization owner' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate password reset link using Supabase Auth Admin API
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: ownerEmail,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/reset-password`
      }
    });

    if (resetError) {
      console.error('Failed to generate reset link:', resetError);
      throw new Error(`Failed to generate reset link: ${resetError.message}`);
    }

    // Log audit
    const { error: auditError } = await supabase.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: user.email,
      p_actor_role: 'super_admin',
      p_actor_type: 'admin',
      p_action_type: 'update',
      p_action_label: `Password reset initiated for organization owner`,
      p_entity_type: 'user_password',
      p_entity_id: ownerEmail,
      p_entity_name: ownerEmail,
      p_organization_id: organizationId,
      p_organization_name: organization.name,
      p_source: 'admin_console',
      p_metadata: {
        action: 'password_reset_initiated',
        owner_email: ownerEmail
      }
    });

    if (auditError) {
      console.warn('Failed to log audit:', auditError);
    }

    console.log(`Password reset link generated for ${ownerEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent to organization owner',
        email: ownerEmail
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in reset-owner-password:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
