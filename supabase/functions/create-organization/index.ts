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

interface BrandingData {
  logo_url?: string;
  app_name?: string;
  primary_color?: string;
  footer_text?: string;
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

// Helper function to adjust color brightness for gradient
function adjustColor(hex: string, percent: number): string {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  } catch {
    return hex;
  }
}

// Generate branded credential email HTML for new users
function generateCredentialEmailHtml(
  recipientEmail: string,
  organizationName: string,
  temporaryPassword: string,
  appUrl: string,
  branding: BrandingData | null
): string {
  const brandName = branding?.app_name || 'PrintoSaas';
  const primaryColor = branding?.primary_color || '#6366f1';
  const gradientEnd = adjustColor(primaryColor, 20);
  const footerText = branding?.footer_text || `This email was sent by ${brandName}. If you didn't request this account, please contact support immediately.`;
  const currentYear = new Date().getFullYear();
  
  // Logo section - use org logo if available, otherwise show brand name
  const logoHtml = branding?.logo_url 
    ? `<img src="${branding.logo_url}" width="180" height="50" alt="${brandName}" style="margin: 0 auto; display: block; object-fit: contain;" />`
    : `<h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-align: center;">${brandName}</h1>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${organizationName}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${gradientEnd} 100%); padding: 40px 20px; text-align: center;">
        ${logoHtml}
      </td>
    </tr>
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 40px 40px 32px;">
        <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 700; line-height: 1.3; margin: 0 0 24px; text-align: center;">
          Welcome to ${organizationName}
        </h1>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hello,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Your organization <strong>${organizationName}</strong> has been created successfully. Below are your login credentials to access your dashboard:
        </p>

        <!-- Credentials Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px;">
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Login URL</p>
              <a href="${appUrl}" style="color: ${primaryColor}; font-size: 16px; font-weight: 500; text-decoration: none;">${appUrl}</a>
              
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 4px;">Email</p>
              <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${recipientEmail}</p>
              
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 4px;">Temporary Password</p>
              <code style="display: inline-block; background-color: #1f2937; color: #f9fafb; padding: 8px 16px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 16px; font-weight: 600; letter-spacing: 0.1em;">${temporaryPassword}</code>
            </td>
          </tr>
        </table>

        <!-- Security Warning -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
                <strong>🔐 Security Notice:</strong> Please change your password immediately after your first login. This temporary password will expire after first use.
              </p>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${appUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Access Your Dashboard
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center; margin: 0;">
          If you have any questions or need assistance, please contact our support team.
        </p>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td style="border-top: 1px solid #e5e7eb;"></td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; background-color: #f9fafb;">
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center; margin: 0 0 8px;">
          ${footerText}
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          © ${currentYear} ${brandName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Generate branded invite email HTML for existing users
function generateInviteEmailHtml(
  recipientEmail: string,
  organizationName: string,
  inviterName: string | undefined,
  appUrl: string,
  branding: BrandingData | null
): string {
  const brandName = branding?.app_name || 'PrintoSaas';
  const primaryColor = branding?.primary_color || '#6366f1';
  const gradientEnd = adjustColor(primaryColor, 20);
  const footerText = branding?.footer_text || `This email was sent by ${brandName}. If you weren't expecting this invitation, you can safely ignore this email.`;
  const currentYear = new Date().getFullYear();
  
  // Logo section
  const logoHtml = branding?.logo_url 
    ? `<img src="${branding.logo_url}" width="180" height="50" alt="${brandName}" style="margin: 0 auto; display: block; object-fit: contain;" />`
    : `<h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-align: center;">${brandName}</h1>`;

  const inviterText = inviterName 
    ? `<strong>${inviterName}</strong> has granted you access to <strong>${organizationName}</strong>.`
    : `You have been granted access to <strong>${organizationName}</strong>.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Granted - ${organizationName}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
    <!-- Header with Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${gradientEnd} 100%); padding: 40px 20px; text-align: center;">
        ${logoHtml}
      </td>
    </tr>
    
    <!-- Main Content -->
    <tr>
      <td style="padding: 40px 40px 32px;">
        <h1 style="color: #1a1a2e; font-size: 24px; font-weight: 700; line-height: 1.3; margin: 0 0 24px; text-align: center;">
          Organization Access Granted
        </h1>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hello,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          ${inviterText}
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          You can now log in using your existing credentials to access the organization dashboard.
        </p>

        <!-- Access Info Box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px;">
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px;">Organization</p>
              <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${organizationName}</p>
              
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 4px;">Your Email</p>
              <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0;">${recipientEmail}</p>
              
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 16px 0 4px;">Dashboard URL</p>
              <a href="${appUrl}" style="color: ${primaryColor}; font-size: 16px; font-weight: 500; text-decoration: none;">${appUrl}</a>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${appUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Access Your Dashboard
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; text-align: center; margin: 0;">
          Use your existing login credentials to access the dashboard. If you have any questions, please contact the organization administrator.
        </p>
      </td>
    </tr>

    <!-- Divider -->
    <tr>
      <td style="border-top: 1px solid #e5e7eb;"></td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 40px; background-color: #f9fafb;">
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center; margin: 0 0 8px;">
          ${footerText}
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          © ${currentYear} ${brandName}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Fetch organization branding or return null for default PrintoSaas branding
async function getOrganizationBranding(
  supabase: any,
  orgId: string
): Promise<BrandingData | null> {
  try {
    // Check if white-label is enabled
    const { data: whiteLabelSettings } = await supabase
      .from('organization_whitelabel_settings')
      .select('whitelabel_enabled')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!whiteLabelSettings?.whitelabel_enabled) {
      return null; // Use default PrintoSaas branding
    }

    // Fetch branding data
    const { data: branding } = await supabase
      .from('organization_branding')
      .select('logo_url, app_name, primary_color, footer_text')
      .eq('organization_id', orgId)
      .maybeSingle();

    return branding || null;
  } catch (error) {
    console.error('Error fetching branding:', error);
    return null;
  }
}

async function sendCredentialEmail(
  resend: Resend,
  email: string,
  organizationName: string,
  isNewUser: boolean,
  tempPassword: string | null,
  appUrl: string,
  inviterName: string | undefined,
  branding: BrandingData | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const brandName = branding?.app_name || 'PrintoSaas';
    let htmlContent: string;
    let subject: string;

    if (isNewUser && tempPassword) {
      subject = `Welcome to ${brandName} - Your ${organizationName} Account is Ready`;
      htmlContent = generateCredentialEmailHtml(
        email,
        organizationName,
        tempPassword,
        appUrl,
        branding
      );
    } else {
      subject = `You've been added to ${organizationName} on ${brandName}`;
      htmlContent = generateInviteEmailHtml(
        email,
        organizationName,
        inviterName,
        appUrl,
        branding
      );
    }

    const { error } = await resend.emails.send({
      from: `${brandName} <onboarding@resend.dev>`,
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
        email_confirm: true,
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

    // Use the SELECTED status and plan - don't default to trial
    const subscriptionStatus = status;
    const subscriptionPlan = plan;
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

    // Fetch organization branding for email
    const branding = await getOrganizationBranding(supabaseAdmin, newOrg.id);
    console.log('Branding for email:', branding ? 'Custom branding' : 'Default PrintoSaas branding');

    // Send credential email with branded template
    let emailSent = false;
    let emailError: string | null = null;
    const finalAppUrl = 'https://printosaas.lovable.app';

    if (resend) {
      const emailResult = await sendCredentialEmail(
        resend,
        ownerEmail,
        organizationName,
        ownerCreated,
        tempPassword,
        finalAppUrl,
        adminEmail || user.email,
        branding
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
        previous_plan: null,
        new_plan: subscriptionPlan,
        branding_used: branding ? 'custom' : 'default',
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
      p_action_label: emailSent 
        ? `${ownerCreated ? 'Credential' : 'Invite'} email sent successfully` 
        : `${ownerCreated ? 'Credential' : 'Invite'} email failed`,
      p_entity_type: 'notification',
      p_entity_id: newOrg.id,
      p_entity_name: ownerCreated ? 'Credential email' : 'Invite email',
      p_organization_id: newOrg.id,
      p_organization_name: organizationName,
      p_source: 'system',
      p_metadata: {
        recipient: ownerEmail,
        email_type: ownerCreated ? 'new_user_credentials' : 'existing_user_access',
        success: emailSent,
        error: emailError,
        template_used: ownerCreated ? 'credential-email' : 'invite-email',
        branding_used: branding ? 'custom' : 'default',
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
          type: ownerCreated ? 'credential' : 'invite',
          branding: branding ? 'custom' : 'default',
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
