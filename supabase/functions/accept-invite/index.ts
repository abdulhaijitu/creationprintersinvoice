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

    // Find the invite by token
    const { data: invite, error: lookupError } = await supabaseAdmin
      .from('organization_invites')
      .select('id, email, role, status, expires_at, organization_id')
      .eq('token', token)
      .maybeSingle();

    if (lookupError || !invite) {
      console.error('Token lookup error:', lookupError);
      return new Response(
        JSON.stringify({ error: 'Invalid invite token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      console.log('Invite already accepted');
      return new Response(
        JSON.stringify({ error: 'This invite has already been accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if cancelled
    if (invite.status === 'cancelled') {
      console.log('Invite was cancelled');
      return new Response(
        JSON.stringify({ error: 'This invite has been cancelled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (invite.expires_at) {
      const expiresAt = new Date(invite.expires_at);
      if (expiresAt < new Date()) {
        console.log('Invite expired');
        return new Response(
          JSON.stringify({ error: 'This invite has expired' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Creating user for email:', invite.email);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === invite.email);

    let userId: string;

    if (existingUser) {
      // User exists, just update their password
      userId = existingUser.id;
      console.log('User exists, updating password for:', userId);
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword, email_confirm: true }
      );

      if (updateError) {
        console.error('Error updating password:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update password: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password: newPassword,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create account: ' + (createError?.message || 'Unknown error') }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('Created new user:', userId);

      // Create profile for new user
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: invite.email.split('@')[0],
          first_login_completed: false,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Continue anyway, profile can be created later
      }
    }

    // Check if already a member of this org
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', invite.organization_id)
      .maybeSingle();

    if (!existingMember) {
      // Add user to organization
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          user_id: userId,
          organization_id: invite.organization_id,
          role: invite.role,
        });

      if (memberError) {
        console.error('Error adding member to organization:', memberError);
        return new Response(
          JSON.stringify({ error: 'Failed to add to organization: ' + memberError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Added user to organization with role:', invite.role);
    } else {
      console.log('User already a member of this organization');
    }

    // Mark invite as accepted
    const { error: updateInviteError } = await supabaseAdmin
      .from('organization_invites')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateInviteError) {
      console.error('Error updating invite status:', updateInviteError);
      // Don't fail, user was already created
    }

    // Log the acceptance event
    try {
      await supabaseAdmin.rpc('insert_audit_log', {
        p_actor_id: userId,
        p_actor_type: 'user',
        p_action_type: 'create',
        p_action_label: 'Accepted organization invite',
        p_entity_type: 'organization_member',
        p_entity_id: userId,
        p_organization_id: invite.organization_id,
        p_source: 'invite_flow',
        p_metadata: {
          invite_id: invite.id,
          role: invite.role,
        },
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
      // Don't fail for audit log errors
    }

    console.log('Invite accepted successfully for:', invite.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Welcome to the team!',
        userId,
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