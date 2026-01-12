import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AddTeamMemberRequest {
  action?: 'add' | 'reset-password';
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  password?: string;
  organizationId: string;
  forcePasswordReset?: boolean;
  // For password reset
  userId?: string;
  newPassword?: string;
}

// Generate a random password if not provided
function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: AddTeamMemberRequest = await req.json();
    const action = body.action || 'add';

    // Handle password reset action
    if (action === 'reset-password') {
      const { userId, newPassword, organizationId } = body;

      if (!userId || !newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID and new password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newPassword.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if requesting user has permission (owner/manager of the org or super_admin)
      const { data: memberData } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('user_id', requestingUser.id)
        .eq('organization_id', organizationId)
        .single();

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', requestingUser.id)
        .single();

      const isSuperAdmin = roleData?.role === 'super_admin';
      const isOwnerOrManager = ['owner', 'manager'].includes(memberData?.role || '');

      if (!isSuperAdmin && !isOwnerOrManager) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only owners and managers can reset passwords' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify target user is in the same organization (for non-super-admins)
      if (!isSuperAdmin) {
        const { data: targetMember } = await supabaseAdmin
          .from('organization_members')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .single();

        if (!targetMember) {
          return new Response(
            JSON.stringify({ success: false, error: 'Target user is not a member of this organization' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent resetting owner password by non-super-admin
        if (targetMember.role === 'owner' && !isSuperAdmin) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot reset owner password' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Reset the password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) {
        console.error('[add-team-member] Password reset error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message || 'Failed to reset password' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Optionally set must_reset_password flag
      await supabaseAdmin
        .from('user_roles')
        .update({ must_reset_password: true })
        .eq('user_id', userId);

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        user_id: requestingUser.id,
        organization_id: organizationId,
        action: 'reset_team_member_password',
        entity_type: 'user',
        entity_id: userId,
        details: { 
          reset_by: requestingUser.email,
        },
      });

      console.log('[add-team-member] Password reset successful for user:', userId);

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original add team member logic
    const { 
      email, 
      fullName, 
      phone, 
      role, 
      password, 
      organizationId,
      forcePasswordReset = true 
    } = body;

    // Validate required fields
    if (!email?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fullName?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Full name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];
    if (!validRoles.includes(role || '')) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is owner or manager of the organization
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('organization_id', organizationId)
      .single();

    if (memberError || !memberData) {
      // Also check if user is super_admin
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', requestingUser.id)
        .single();
      
      if (roleData?.role !== 'super_admin') {
        console.log('[add-team-member] Access denied: User is not a member of this organization', { userId: requestingUser.id });
        return new Response(
          JSON.stringify({ success: false, error: 'You are not a member of this organization' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (!['owner', 'manager'].includes(memberData.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only owners and managers can add team members' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      // Check if already a member of this organization
      const { data: existingMember } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organizationId)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ success: false, error: 'This user is already a member of the organization' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // User exists but not in this org - add them
      const { error: addMemberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          user_id: existingUser.id,
          organization_id: organizationId,
          role: role,
        });

      if (addMemberError) {
        console.error('[add-team-member] Error adding existing user to org:', addMemberError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to add user to organization' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the action
      await supabaseAdmin.from('audit_logs').insert({
        user_id: requestingUser.id,
        organization_id: organizationId,
        action: 'add_existing_team_member',
        entity_type: 'organization_member',
        entity_id: existingUser.id,
        details: { 
          added_user_email: normalizedEmail,
          added_user_name: fullName,
          role: role,
        },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Existing user added to organization',
          user: { 
            id: existingUser.id, 
            email: normalizedEmail,
            isNewUser: false,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        force_password_reset: forcePasswordReset,
      },
    });

    if (createError) {
      console.error('[add-team-member] Error creating user:', createError);
      
      if (createError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ success: false, error: 'A user with this email already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create profile (the trigger should do this, but let's be safe)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        first_login_completed: false,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('[add-team-member] Error creating/updating profile:', profileError);
      // Continue - not critical
    }

    // Update user_roles to set must_reset_password if forcePasswordReset is true
    if (forcePasswordReset) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ must_reset_password: true })
        .eq('user_id', newUser.user.id);
      
      if (roleUpdateError) {
        console.error('[add-team-member] Error updating must_reset_password:', roleUpdateError);
      }
    }

    // Add to organization_members
    const { error: memberInsertError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        user_id: newUser.user.id,
        organization_id: organizationId,
        role: role,
      });

    if (memberInsertError) {
      console.error('[add-team-member] Error adding to organization:', memberInsertError);
      
      // Rollback: delete the user we just created
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add user to organization. User creation rolled back.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization name for audit log
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: requestingUser.id,
      organization_id: organizationId,
      action: 'add_team_member_manually',
      entity_type: 'organization_member',
      entity_id: newUser.user.id,
      details: { 
        added_user_email: normalizedEmail,
        added_user_name: fullName.trim(),
        role: role,
        force_password_reset: forcePasswordReset,
        organization_name: orgData?.name,
      },
    });

    console.log('[add-team-member] Successfully created user and added to organization:', {
      userId: newUser.user.id,
      email: normalizedEmail,
      organizationId,
      role,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Team member added successfully',
        user: { 
          id: newUser.user.id, 
          email: normalizedEmail,
          isNewUser: true,
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[add-team-member] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
