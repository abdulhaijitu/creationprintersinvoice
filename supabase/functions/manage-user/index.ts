import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

// Generate professional email HTML
const generateCredentialsEmail = (params: {
  organizationName: string;
  userEmail: string;
  fullName: string;
  password: string;
  loginUrl: string;
  isReset: boolean;
}) => {
  const { organizationName, userEmail, fullName, password, loginUrl, isReset } = params;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isReset ? 'Password Reset' : 'Welcome to ' + organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${isReset ? '🔐 Password Reset' : '🎉 Welcome!'}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${isReset 
                  ? 'Your password has been reset by an administrator. Please use the credentials below to log in.'
                  : `Your account has been created for <strong>${organizationName}</strong>. Please use the credentials below to log in.`
                }
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 12px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</p>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Email:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${userEmail}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 100px;">Password:</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace; background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; display: inline-block;">${password}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      Login to Your Account
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 30px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                      <strong>⚠️ Security Notice:</strong><br>
                      For security reasons, please change your password immediately after login. This is a temporary password that should not be shared.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} ${organizationName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is a super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
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

    // Check if the requesting user is super_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleError || roleData?.role !== 'super_admin') {
      console.log('Access denied: User is not super_admin', { userId: requestingUser.id, role: roleData?.role });
      return new Response(
        JSON.stringify({ success: false, error: 'Super Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, email, password, fullName, organizationId, role, forcePasswordReset, sendEmail, loginUrl, isInternalUser } = body as {
      action: string;
      userId?: string;
      email?: string;
      password?: string;
      fullName?: string;
      organizationId?: string;
      role?: string;
      forcePasswordReset?: boolean;
      sendEmail?: boolean;
      loginUrl?: string;
      isInternalUser?: boolean;
    };

    console.log('manage-user action:', action, { userId, email, role, sendEmail });

    // Helper function to send credentials email
    const sendCredentialsEmail = async (params: {
      userEmail: string;
      fullName: string;
      password: string;
      organizationName: string;
      isReset: boolean;
    }) => {
      const { userEmail, fullName: name, password: pwd, organizationName, isReset } = params;
      
      try {
        const emailHtml = generateCredentialsEmail({
          organizationName,
          userEmail,
          fullName: name,
          password: pwd,
          loginUrl: loginUrl || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/login`,
          isReset,
        });

        const result = await resend.emails.send({
          from: 'PrintoSaas <onboarding@resend.dev>',
          to: [userEmail],
          subject: isReset 
            ? `Password Reset - ${organizationName}` 
            : `Welcome to ${organizationName} - Your Login Credentials`,
          html: emailHtml,
        });

        console.log('Email sent successfully:', result);
        return { success: true, emailId: result.data?.id };
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        return { success: false, error: emailError instanceof Error ? emailError.message : 'Email delivery failed' };
      }
    };

    switch (action) {
      case 'create': {
        // Validate required fields
        if (!email?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!password || password.length < 8) {
          return new Response(
            JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!fullName?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Full name is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

        if (existingUser) {
          return new Response(
            JSON.stringify({ success: false, error: 'A user with this email already exists' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user with Supabase Admin API
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
          user_metadata: { 
            full_name: fullName.trim(),
            force_password_reset: forcePasswordReset || true,
          },
        });

        if (createError) {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: newUser.user.id,
            full_name: fullName.trim(),
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }

        // Determine organization name for email
        let organizationName = 'PrintoSaas Platform';
        if (organizationId) {
          const { data: orgData } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single();
          if (orgData) organizationName = orgData.name;
        }

        // For internal users, set up the user_roles record with internal role
        if (isInternalUser && role) {
          // Update user_roles with the internal role (admin/service/support)
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .update({ 
              role: role as 'admin' | 'service' | 'support',
              must_reset_password: forcePasswordReset || true 
            })
            .eq('user_id', newUser.user.id);

          if (roleError) {
            console.error('Error setting user role:', roleError);
          }
        } else if (organizationId && role) {
          // For organization users, add to organization_members
          const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
              user_id: newUser.user.id,
              organization_id: organizationId,
              role: role,
            });

          if (memberError) {
            console.error('Error adding to organization:', memberError);
          }
        }

        // Send credentials email if requested
        let emailResult = null;
        if (sendEmail) {
          emailResult = await sendCredentialsEmail({
            userEmail: email.trim().toLowerCase(),
            fullName: fullName.trim(),
            password,
            organizationName,
            isReset: false,
          });
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'create_user',
            entity_type: 'user',
            entity_id: newUser.user.id,
            details: { 
              email: email.trim().toLowerCase(), 
              full_name: fullName.trim(),
              organization_id: organizationId,
              role,
              is_internal_user: isInternalUser,
              email_sent: sendEmail && emailResult?.success,
            },
          });

        return new Response(
          JSON.stringify({ 
            success: true, 
            user: { 
              id: newUser.user.id, 
              email: newUser.user.email 
            },
            emailSent: sendEmail ? emailResult?.success : null,
            emailError: sendEmail && !emailResult?.success ? emailResult?.error : null,
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_password': {
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!password || password.length < 8) {
          return new Response(
            JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          user_metadata: { force_password_reset: forcePasswordReset || false },
        });

        if (updateError) {
          console.error('Error updating password:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Send credentials email if requested
        let emailResult = null;
        if (sendEmail && email) {
          // Get user's organization
          const { data: memberData } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, organizations(name)')
            .eq('user_id', userId)
            .single();
          
          const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

          const organizationName = (memberData?.organizations as unknown as { name: string } | null)?.name || 'PrintoSaas Platform';
          const userName = profileData?.full_name || email;

          emailResult = await sendCredentialsEmail({
            userEmail: email,
            fullName: userName,
            password,
            organizationName,
            isReset: true,
          });
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'reset_user_password',
            entity_type: 'user',
            entity_id: userId,
            details: { 
              force_password_reset: forcePasswordReset,
              email_sent: sendEmail && emailResult?.success,
            },
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            emailSent: sendEmail ? emailResult?.success : null,
            emailError: sendEmail && !emailResult?.success ? emailResult?.error : null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_email': {
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!email?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: email.trim().toLowerCase(),
          email_confirm: true,
        });

        if (updateError) {
          console.error('Error updating email:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'update_user_email',
            entity_type: 'user',
            entity_id: userId,
            details: { new_email: email.trim().toLowerCase() },
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'disable': {
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: '876000h', // ~100 years
        });

        if (updateError) {
          console.error('Error disabling user:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'disable_user',
            entity_type: 'user',
            entity_id: userId,
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enable': {
        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });

        if (updateError) {
          console.error('Error enabling user:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'enable_user',
            entity_type: 'user',
            entity_id: userId,
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Super Admin: Reassign organization owner
      case 'reassign_owner': {
        if (!organizationId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Organization ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'New owner user ID is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify the new owner is a member of the organization
        const { data: memberCheck, error: memberCheckError } = await supabaseAdmin
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .single();

        if (memberCheckError || !memberCheck) {
          return new Response(
            JSON.stringify({ success: false, error: 'User is not a member of this organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current owner
        const { data: currentOwner, error: currentOwnerError } = await supabaseAdmin
          .from('organization_members')
          .select('id, user_id')
          .eq('organization_id', organizationId)
          .eq('role', 'owner')
          .single();

        if (currentOwnerError && currentOwnerError.code !== 'PGRST116') {
          console.error('Error finding current owner:', currentOwnerError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to verify current owner' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cannot reassign to same user
        if (currentOwner && currentOwner.user_id === userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'User is already the owner' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Transaction: demote old owner, promote new owner
        // Step 1: Demote current owner to manager
        if (currentOwner) {
          const { error: demoteError } = await supabaseAdmin
            .from('organization_members')
            .update({ role: 'manager' })
            .eq('id', currentOwner.id);

          if (demoteError) {
            console.error('Error demoting current owner:', demoteError);
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to demote current owner' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Step 2: Promote new owner
        const { error: promoteError } = await supabaseAdmin
          .from('organization_members')
          .update({ role: 'owner' })
          .eq('id', memberCheck.id);

        if (promoteError) {
          // Rollback: restore old owner
          if (currentOwner) {
            await supabaseAdmin
              .from('organization_members')
              .update({ role: 'owner' })
              .eq('id', currentOwner.id);
          }
          console.error('Error promoting new owner:', promoteError);
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to promote new owner' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 3: Update organization.owner_id and owner_email
        const { data: newOwnerProfile } = await supabaseAdmin.auth.admin.getUserById(userId);
        const newOwnerEmail = newOwnerProfile?.user?.email;

        const { error: orgUpdateError } = await supabaseAdmin
          .from('organizations')
          .update({ 
            owner_id: userId,
            owner_email: newOwnerEmail || null
          })
          .eq('id', organizationId);

        if (orgUpdateError) {
          console.error('Error updating organization owner:', orgUpdateError);
          // Continue anyway - member role is the source of truth
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'reassign_organization_owner',
            entity_type: 'organization',
            entity_id: organizationId,
            details: { 
              previous_owner_id: currentOwner?.user_id || null,
              new_owner_id: userId,
              new_owner_email: newOwnerEmail,
            },
          });

        return new Response(
          JSON.stringify({ 
            success: true,
            previousOwnerId: currentOwner?.user_id || null,
            newOwnerId: userId,
            newOwnerEmail,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate role change - prevent unauthorized owner assignment
      case 'update_role': {
        if (!userId || !organizationId || !role) {
          return new Response(
            JSON.stringify({ success: false, error: 'User ID, organization ID, and role are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cannot assign owner role through this action
        if (role === 'owner') {
          return new Response(
            JSON.stringify({ success: false, error: 'Owner role can only be assigned via reassign_owner action' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user is current owner - cannot demote owner through this action
        const { data: memberData, error: memberError } = await supabaseAdmin
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', organizationId)
          .eq('user_id', userId)
          .single();

        if (memberError || !memberData) {
          return new Response(
            JSON.stringify({ success: false, error: 'User is not a member of this organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (memberData.role === 'owner') {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot change owner role. Use reassign_owner action instead.' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update role
        const { error: updateError } = await supabaseAdmin
          .from('organization_members')
          .update({ role })
          .eq('id', memberData.id);

        if (updateError) {
          console.error('Error updating role:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_user_id: requestingUser.id,
            action: 'update_member_role',
            entity_type: 'organization_member',
            entity_id: memberData.id,
            details: { 
              organization_id: organizationId,
              user_id: userId,
              old_role: memberData.role,
              new_role: role,
            },
          });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error in manage-user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
