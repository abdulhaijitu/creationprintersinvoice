import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrganizationRequest {
  organizationName: string;
  ownerEmail: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  trialDays?: number;
  status: 'trial' | 'active' | 'suspended';
  adminEmail?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function sendCredentialEmail(
  resend: Resend,
  email: string,
  organizationName: string,
  isNewUser: boolean,
  tempPassword: string | null,
  appUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = isNewUser 
      ? `Welcome to PrintoSaas - Your ${organizationName} Account is Ready`
      : `You've been added to ${organizationName} on PrintoSaas`;

    const htmlContent = isNewUser
      ? `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to PrintoSaas</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Your organization <strong>${organizationName}</strong> has been created on PrintoSaas. Below are your login credentials:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${appUrl}" style="color: #6366f1;">${appUrl}</a></p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Login to PrintoSaas</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If you have any questions, please contact our support team.</p>
          </div>
          <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} PrintoSaas. All rights reserved.</p>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Organization Access Granted</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You have been granted access to <strong>${organizationName}</strong> on PrintoSaas.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${appUrl}" style="color: #6366f1;">${appUrl}</a></p>
              <p style="margin: 5px 0;">Use your existing PrintoSaas credentials to log in.</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Login to PrintoSaas</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">If you have any questions, please contact our support team.</p>
          </div>
          <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} PrintoSaas. All rights reserved.</p>
        </body>
        </html>
      `;

    const { error } = await resend.emails.send({
      from: 'PrintoSaas <onboarding@resend.dev>',
      to: [email],
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown email error';
    console.error('Email sending failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // Initialize Resend if API key is available
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify their role
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is a super_admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || userRole?.role !== 'super_admin') {
      console.error('Unauthorized access attempt:', { userId: user.id, role: userRole?.role });
      return new Response(
        JSON.stringify({ error: 'Only Super Admins can create organizations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: CreateOrganizationRequest = await req.json();
    const { organizationName, ownerEmail, plan, trialDays = 14, status, adminEmail } = body;

    // Validate required fields
    if (!organizationName || !ownerEmail || !plan || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizationName, ownerEmail, plan, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating organization:', { 
      organizationName, 
      ownerEmail, 
      plan, 
      status, 
      trialDays,
      // Explicitly log that we're using the selected plan/status
      selectedPlan: plan,
      selectedStatus: status
    });

    // Check for duplicate organization name
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .ilike('name', organizationName)
      .maybeSingle();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ error: 'An organization with this name already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === ownerEmail.toLowerCase());

    let ownerId: string | null = null;
    let ownerCreated = false;
    let tempPassword: string | null = null;

    if (existingUser) {
      ownerId = existingUser.id;
      console.log('Found existing user:', ownerId);
    } else {
      // Generate a secure temporary password
      tempPassword = generateSecurePassword();
      
      // Create a new user with the temporary password
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: tempPassword,
        email_confirm: true, // Confirm email so they can log in immediately
        user_metadata: {
          full_name: organizationName + ' Owner',
          invited_by: adminEmail || user.email,
          requires_password_change: true,
        }
      });

      if (createUserError) {
        console.error('Error creating user:', createUserError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + createUserError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      ownerId = newUser.user.id;
      ownerCreated = true;
      console.log('Created new user:', ownerId);
    }

    // Generate unique slug
    const slug = generateSlug(organizationName);

    // Create the organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName,
        slug,
        owner_id: ownerId,
        owner_email: ownerEmail,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      // Rollback: delete the user if we created them
      if (ownerCreated && ownerId) {
        await supabaseAdmin.auth.admin.deleteUser(ownerId);
        console.log('Rolled back user creation due to org failure');
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create organization: ' + orgError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created organization:', newOrg.id);

    // Add owner as organization member
    if (ownerId) {
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: newOrg.id,
          user_id: ownerId,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding member:', memberError);
      }
    }

    // CRITICAL: Use the SELECTED status and plan - don't default to trial
    // Only set trial_ends_at if status is explicitly 'trial'
    const subscriptionStatus = status; // Use the selected status directly
    const subscriptionPlan = plan; // Use the selected plan directly
    const trialEndsAt = subscriptionStatus === 'trial' 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    console.log('Creating subscription with:', {
      plan: subscriptionPlan,
      status: subscriptionStatus,
      trial_ends_at: trialEndsAt
    });

    // Create subscription with the SELECTED plan and status
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: newOrg.id,
        plan: subscriptionPlan,
        status: subscriptionStatus,
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Rollback: delete org and user
      await supabaseAdmin.from('organization_members').delete().eq('organization_id', newOrg.id);
      await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id);
      if (ownerCreated && ownerId) {
        await supabaseAdmin.auth.admin.deleteUser(ownerId);
      }
      console.log('Rolled back due to subscription failure');
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription: ' + subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created subscription:', { 
      id: subscription.id, 
      plan: subscription.plan, 
      status: subscription.status 
    });

    // Send credential email
    let emailSent = false;
    let emailError: string | null = null;
    const appUrl = supabaseUrl.replace('.supabase.co', '.lovable.app').replace('https://nauwhubjoxeihxhmegjh', 'https://printosaas');
    // Fallback to a reasonable default
    const finalAppUrl = 'https://printosaas.lovable.app';

    if (resend) {
      const emailResult = await sendCredentialEmail(
        resend,
        ownerEmail,
        organizationName,
        ownerCreated,
        tempPassword,
        finalAppUrl
      );
      emailSent = emailResult.success;
      emailError = emailResult.error || null;
      
      console.log('Email send result:', { emailSent, emailError });
    } else {
      console.warn('RESEND_API_KEY not configured, skipping email');
      emailError = 'Email service not configured';
    }

    // Log the creation in audit logs
    await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: adminEmail || user.email,
      p_actor_role: 'super_admin',
      p_actor_type: 'user',
      p_action_type: 'create',
      p_action_label: 'Created organization manually',
      p_entity_type: 'organization',
      p_entity_id: newOrg.id,
      p_entity_name: organizationName,
      p_organization_id: newOrg.id,
      p_organization_name: organizationName,
      p_source: 'ui',
      p_metadata: {
        owner_email: ownerEmail,
        plan: subscriptionPlan,
        status: subscriptionStatus,
        trial_days: subscriptionStatus === 'trial' ? trialDays : null,
        owner_created: ownerCreated,
        email_sent: emailSent,
        email_error: emailError,
        previous_plan: null, // New organization, no previous plan
        new_plan: subscriptionPlan,
      },
    });

    // Log plan application separately for tracking
    await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: adminEmail || user.email,
      p_actor_role: 'super_admin',
      p_actor_type: 'user',
      p_action_type: 'update',
      p_action_label: `Applied ${subscriptionPlan} plan (${subscriptionStatus})`,
      p_entity_type: 'subscription',
      p_entity_id: subscription.id,
      p_entity_name: `${organizationName} subscription`,
      p_organization_id: newOrg.id,
      p_organization_name: organizationName,
      p_source: 'ui',
      p_metadata: {
        previous_plan: null,
        new_plan: subscriptionPlan,
        status: subscriptionStatus,
      },
    });

    // Log email send attempt
    await supabaseAdmin.rpc('insert_audit_log', {
      p_actor_id: user.id,
      p_actor_email: adminEmail || user.email,
      p_actor_role: 'super_admin',
      p_actor_type: 'system',
      p_action_type: emailSent ? 'access' : 'update',
      p_action_label: emailSent ? 'Credential email sent successfully' : 'Credential email failed',
      p_entity_type: 'notification',
      p_entity_id: newOrg.id,
      p_entity_name: 'Credential email',
      p_organization_id: newOrg.id,
      p_organization_name: organizationName,
      p_source: 'system',
      p_metadata: {
        recipient: ownerEmail,
        email_type: ownerCreated ? 'new_user_credentials' : 'existing_user_access',
        success: emailSent,
        error: emailError,
      },
    });

    console.log('Organization creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
        },
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          trial_ends_at: subscription.trial_ends_at,
        },
        owner: {
          id: ownerId,
          email: ownerEmail,
          created: ownerCreated,
        },
        email: {
          sent: emailSent,
          error: emailError,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in create-organization:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
