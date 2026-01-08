import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrganizationRequest {
  organizationName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerRole?: 'owner' | 'manager';  // Explicit role selection
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  trialDays?: number;
  status: 'trial' | 'active' | 'suspended';
  adminEmail?: string;
  sendEmail?: boolean;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

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

function generateCredentialsEmailHtml(
  recipientEmail: string,
  organizationName: string,
  password: string,
  loginUrl: string
): string {
  const primaryColor = '#6366f1';
  const gradientEnd = adjustColor(primaryColor, 20);
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Credentials - ${organizationName}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <tr>
      <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${gradientEnd} 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">Welcome to PrintoSaas</h1>
      </td>
    </tr>
    
    <tr>
      <td style="padding: 40px;">
        <h2 style="color: #1a1a2e; font-size: 22px; font-weight: 700; margin: 0 0 20px; text-align: center;">
          Your Account for ${organizationName}
        </h2>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
          Your account has been created. Use the credentials below to log in.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; margin: 24px 0;">
          <tr>
            <td style="padding: 24px;">
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px;">Email</p>
              <p style="color: #1f2937; font-size: 16px; font-weight: 500; margin: 0 0 16px;">${recipientEmail}</p>
              
              <p style="color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px;">Password</p>
              <p style="color: #1f2937; font-size: 16px; font-weight: 600; font-family: monospace; background-color: #fef3c7; padding: 8px 12px; border-radius: 4px; border: 1px dashed #d1d5db; margin: 0;">${password}</p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <tr>
            <td style="padding: 16px 20px;">
              <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
                <strong>⚠️ Security Notice:</strong> For security reasons, please change your password immediately after your first login.
              </p>
            </td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
          <tr>
            <td style="text-align: center;">
              <a href="${loginUrl}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                Login to Your Account
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 0;">
          Login URL: <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a>
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0 0 8px;">
          This email was sent by PrintoSaas. If you didn't expect this, please contact support.
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          © ${currentYear} PrintoSaas. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check super_admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || userRole?.role !== 'super_admin') {
      console.error('Unauthorized access attempt:', { userId: user.id, role: userRole?.role });
      return new Response(
        JSON.stringify({ success: false, error: 'Super Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: CreateOrganizationRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      organizationName, 
      ownerEmail, 
      ownerPassword,
      ownerRole = 'owner',  // Default to owner if not specified
      plan, 
      trialDays = 14, 
      status, 
      adminEmail,
      sendEmail = true
    } = body;

    // Validate ownerRole
    if (!['owner', 'manager'].includes(ownerRole)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid owner role. Must be "owner" or "manager"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!organizationName?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ownerEmail?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Owner email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ownerPassword || ownerPassword.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!plan || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Plan and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating organization:', { organizationName, ownerEmail, plan, status });

    // Check for duplicate organization name
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .ilike('name', organizationName.trim())
      .maybeSingle();

    if (existingOrg) {
      return new Response(
        JSON.stringify({ success: false, error: 'An organization with this name already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === ownerEmail.toLowerCase().trim());

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'A user with this email already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user directly with provided password
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail.toLowerCase().trim(),
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: organizationName.trim() + ' Owner',
        invited_by: adminEmail || user.email,
        must_reset_password: true,
      }
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user: ' + createUserError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ownerId = newUser.user.id;
    console.log('Created user:', ownerId);

    // Generate slug
    const slug = generateSlug(organizationName.trim());

    // Create organization
    // If role is 'manager', we don't set owner_id (org has no owner yet)
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        slug,
        owner_id: ownerRole === 'owner' ? ownerId : null,
        owner_email: ownerRole === 'owner' ? ownerEmail.toLowerCase().trim() : null,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      console.log('Rolled back user creation');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create organization: ' + orgError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created organization:', newOrg.id);

    // Add user as organization member with selected role
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: ownerId,
        role: ownerRole,  // Use the selected role
      });

    console.log('Created member with role:', ownerRole);

    if (memberError) {
      console.error('Error adding member:', memberError);
      // Rollback
      await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id);
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      console.log('Rolled back due to member error');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to assign owner role: ' + memberError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_reset_password flag
    await supabaseAdmin
      .from('user_roles')
      .update({ must_reset_password: true })
      .eq('user_id', ownerId);

    // Create subscription
    const trialEndsAt = status === 'trial' 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: newOrg.id,
        plan,
        status,
        trial_ends_at: trialEndsAt,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Rollback
      await supabaseAdmin.from('organization_members').delete().eq('organization_id', newOrg.id);
      await supabaseAdmin.from('organizations').delete().eq('id', newOrg.id);
      await supabaseAdmin.auth.admin.deleteUser(ownerId);
      console.log('Rolled back due to subscription error');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create subscription: ' + subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created subscription:', { plan: subscription.plan, status: subscription.status });

    // Send credentials email if requested
    let emailSent = false;
    let emailError: string | null = null;
    const loginUrl = 'https://printosaas.lovable.app/login';

    if (sendEmail && resend) {
      try {
        const emailHtml = generateCredentialsEmailHtml(
          ownerEmail.toLowerCase().trim(),
          organizationName.trim(),
          ownerPassword,
          loginUrl
        );

        const { error: sendError } = await resend.emails.send({
          from: 'PrintoSaas <onboarding@resend.dev>',
          to: [ownerEmail.toLowerCase().trim()],
          subject: `Your Login Credentials for ${organizationName.trim()}`,
          html: emailHtml,
        });

        if (sendError) {
          console.error('Email send error:', sendError);
          emailError = sendError.message;
        } else {
          emailSent = true;
          console.log('Credentials email sent successfully');
        }
      } catch (err) {
        console.error('Email sending failed:', err);
        emailError = err instanceof Error ? err.message : 'Email delivery failed';
      }
    } else if (sendEmail && !resend) {
      emailError = 'Email service not configured';
    }

    // Log audit
    try {
      await supabaseAdmin.rpc('insert_audit_log', {
        p_actor_id: user.id,
        p_actor_email: adminEmail || user.email,
        p_actor_role: 'super_admin',
        p_actor_type: 'user',
        p_action_type: 'create',
        p_action_label: 'Created organization with owner',
        p_entity_type: 'organization',
        p_entity_id: newOrg.id,
        p_entity_name: organizationName.trim(),
        p_organization_id: newOrg.id,
        p_organization_name: organizationName.trim(),
        p_source: 'ui',
        p_metadata: {
          owner_email: ownerEmail.toLowerCase().trim(),
          owner_role: ownerRole,
          plan,
          status,
          trial_days: status === 'trial' ? trialDays : null,
          email_sent: emailSent,
          has_owner: ownerRole === 'owner',
        },
      });
    } catch (auditErr) {
      console.error('Audit log failed:', auditErr);
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          has_owner: ownerRole === 'owner',
        },
        member: {
          id: ownerId,
          email: ownerEmail.toLowerCase().trim(),
          role: ownerRole,
          created: true,
        },
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          trial_ends_at: subscription.trial_ends_at,
        },
        email: {
          sent: emailSent,
          error: emailError,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
