import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Resend API wrapper (direct fetch instead of npm package for Deno compatibility)
class ResendClient {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendEmail(params: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  }): Promise<{ id: string }> {
    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendInviteRequest {
  email: string;
  role: string;
  note?: string | null;
  organizationId: string;
  resend?: boolean; // If true, this is a resend operation
  inviteId?: string; // Required for resend
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for Resend API key first
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-invite] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured', 
          code: 'EMAIL_NOT_CONFIGURED',
          message: 'Please configure RESEND_API_KEY in your project settings to send invitation emails.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new ResendClient(resendApiKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      console.error('[send-invite] Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;
    console.log('[send-invite] Request from user:', userId);

    // Parse request
    const body: SendInviteRequest = await req.json();
    const { email, role, note, organizationId, resend: isResend, inviteId } = body;

    // Validate required fields
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isResend && !email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isResend && !inviteId) {
      return new Response(
        JSON.stringify({ error: 'Invite ID is required for resend' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to invite (must be owner or manager)
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (memberError || !memberData) {
      console.error('[send-invite] Member lookup error:', memberError);
      return new Response(
        JSON.stringify({ error: 'You are not a member of this organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['owner', 'manager'].includes(memberData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only owners and managers can send invitations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details for the email
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgData) {
      console.error('[send-invite] Org lookup error:', orgError);
      return new Response(
        JSON.stringify({ error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationName = orgData.name || 'Your Organization';

    let invite;
    let inviteEmail: string;
    let inviteToken: string;

    if (isResend) {
      // Resend: Fetch existing invite and update it
      const { data: existingInvite, error: inviteError } = await supabaseAdmin
        .from('organization_invites')
        .select('*')
        .eq('id', inviteId)
        .eq('organization_id', organizationId)
        .single();

      if (inviteError || !existingInvite) {
        console.error('[send-invite] Invite lookup error:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Invitation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingInvite.status !== 'pending') {
        return new Response(
          JSON.stringify({ error: `Cannot resend ${existingInvite.status} invitation` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update expiration
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: updateError } = await supabaseAdmin
        .from('organization_invites')
        .update({ 
          expires_at: newExpiry,
          updated_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      if (updateError) {
        console.error('[send-invite] Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invite = existingInvite;
      inviteEmail = existingInvite.email;
      inviteToken = existingInvite.token;
    } else {
      // New invite: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user is already a member
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);
      
      if (existingUser) {
        const { data: existingMember } = await supabaseAdmin
          .from('organization_members')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('organization_id', organizationId)
          .single();

        if (existingMember) {
          return new Response(
            JSON.stringify({ error: 'This user is already a member of the organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Check for existing pending invite
      const { data: existingInvite } = await supabaseAdmin
        .from('organization_invites')
        .select('id, status')
        .eq('email', normalizedEmail)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .single();

      if (existingInvite) {
        return new Response(
          JSON.stringify({ error: 'An invitation is already pending for this email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create the invite record
      const { data: newInvite, error: insertError } = await supabaseAdmin
        .from('organization_invites')
        .insert({
          organization_id: organizationId,
          email: normalizedEmail,
          role: role || 'employee',
          note: note || null,
          invited_by: userId,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (insertError || !newInvite) {
        console.error('[send-invite] Insert error:', insertError);
        
        if (insertError?.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'An invitation has already been sent to this email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: 'Failed to create invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invite = newInvite;
      inviteEmail = normalizedEmail;
      inviteToken = newInvite.token;
    }

    console.log('[send-invite] Sending email to:', inviteEmail);

    // Build the invite URL (use the app's origin)
    const appOrigin = req.headers.get('origin') || 'https://app.example.com';
    const inviteUrl = `${appOrigin}/accept-invite?token=${inviteToken}`;

    // Send the invitation email via Resend
    try {
      const emailResponse = await resend.sendEmail({
        from: 'Team Invite <onboarding@resend.dev>',
        to: [inviteEmail],
        subject: `You've been invited to join ${organizationName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
              .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
              .content { padding: 40px 30px; }
              .content h2 { color: #1a1a1a; margin-top: 0; }
              .content p { color: #666; margin-bottom: 20px; }
              .role-badge { display: inline-block; background: #e8e8ff; color: #667eea; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
              .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 20px 0; }
              .button:hover { opacity: 0.9; }
              .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; font-size: 12px; color: #999; }
              .expire-note { background: #fff8e6; border: 1px solid #ffe5a0; border-radius: 6px; padding: 12px 16px; margin-top: 20px; font-size: 14px; color: #856404; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 You're Invited!</h1>
              </div>
              <div class="content">
                <h2>Welcome to ${organizationName}</h2>
                <p>You've been invited to join <strong>${organizationName}</strong> as a team member.</p>
                <p>Your role: <span class="role-badge">${invite.role || 'Employee'}</span></p>
                ${invite.note ? `<p><em>Message from inviter: "${invite.note}"</em></p>` : ''}
                <p>Click the button below to set up your account and get started:</p>
                <p style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Accept Invitation</a>
                </p>
                <div class="expire-note">
                  ⏰ This invitation will expire in 7 days. Please accept it soon!
                </div>
              </div>
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>© ${new Date().getFullYear()} ${organizationName}</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      console.log('[send-invite] Email sent successfully:', emailResponse);

      // Return success with invite data
      return new Response(
        JSON.stringify({
          success: true,
          message: isResend ? 'Invitation resent successfully' : 'Invitation sent successfully',
          invite: {
            id: invite.id,
            email: inviteEmail,
            role: invite.role,
            status: 'pending',
            created_at: invite.created_at,
            expires_at: invite.expires_at,
          },
          emailId: emailResponse.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError: unknown) {
      const emailErrorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error';
      console.error('[send-invite] Email send error:', emailError);

      // If this was a new invite, we need to mark it as failed or delete it
      if (!isResend && invite?.id) {
        await supabaseAdmin
          .from('organization_invites')
          .update({ status: 'failed' })
          .eq('id', invite.id);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to send invitation email',
          code: 'EMAIL_SEND_FAILED',
          details: emailErrorMessage,
          message: 'The invitation was created but the email could not be sent. Please check your email configuration.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-invite] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
