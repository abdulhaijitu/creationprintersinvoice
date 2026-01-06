import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcceptInviteRequest {
  token: string;
  newPassword: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: AcceptInviteRequest = await req.json();
    const { token, newPassword } = body;

    // Validate required fields
    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    const passwordRequirements = [
      { test: newPassword.length >= 8, message: 'Password must be at least 8 characters' },
      { test: /[A-Z]/.test(newPassword), message: 'Password must contain an uppercase letter' },
      { test: /[a-z]/.test(newPassword), message: 'Password must contain a lowercase letter' },
      { test: /\d/.test(newPassword), message: 'Password must contain a number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), message: 'Password must contain a special character' },
    ];

    const failedRequirement = passwordRequirements.find(r => !r.test);
    if (failedRequirement) {
      return new Response(
        JSON.stringify({ error: failedRequirement.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing invite acceptance for token:', token.substring(0, 8) + '...');

    // Find the user with this invite token
    const { data: userRole, error: lookupError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, invite_token, invite_token_expires_at, invite_used_at')
      .eq('invite_token', token)
      .maybeSingle();

    if (lookupError || !userRole) {
      console.error('Token lookup error:', lookupError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already used
    if (userRole.invite_used_at) {
      console.log('Token already used');
      return new Response(
        JSON.stringify({ error: 'This invite link has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (userRole.invite_token_expires_at) {
      const expiresAt = new Date(userRole.invite_token_expires_at);
      if (expiresAt < new Date()) {
        console.log('Token expired');
        return new Response(
          JSON.stringify({ error: 'This invite link has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const userId = userRole.user_id;
    console.log('Setting password for user:', userId);

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update password: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the invite as used and clear the reset flag
    const { error: flagError } = await supabaseAdmin
      .from('user_roles')
      .update({
        must_reset_password: false,
        password_reset_at: new Date().toISOString(),
        invite_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (flagError) {
      console.error('Error updating invite status:', flagError);
      // Don't fail the request, password was already updated
    }

    // Get organization for audit log
    const { data: member } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Log the password set event
    if (member?.organization_id) {
      await supabaseAdmin.rpc('insert_audit_log', {
        p_actor_id: userId,
        p_actor_type: 'user',
        p_action_type: 'update',
        p_action_label: 'Password set via invite link',
        p_entity_type: 'user_password',
        p_entity_id: userId,
        p_organization_id: member.organization_id,
        p_source: 'invite_flow',
        p_metadata: {
          source: 'invite_acceptance',
          invite_token_used: true,
        },
      });
    }

    console.log('Password set successfully for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password set successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in accept-invite:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
