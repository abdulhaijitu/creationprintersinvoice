import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    console.log('Creating organization:', { organizationName, ownerEmail, plan, status, trialDays });

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
    let inviteSent = false;

    if (existingUser) {
      ownerId = existingUser.id;
      console.log('Found existing user:', ownerId);
    } else {
      // Create a new user with a temporary password and send invite
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: tempPassword,
        email_confirm: false, // Don't confirm email yet
        user_metadata: {
          full_name: organizationName + ' Owner',
          invited_by: adminEmail || user.email,
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

      // Generate password reset link (acts as invite)
      const { error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: ownerEmail,
      });

      if (!inviteError) {
        inviteSent = true;
      }

      console.log('Created new user:', ownerId, 'Invite sent:', inviteSent);
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

    // Calculate trial end date
    const trialEndsAt = status === 'trial' 
      ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Create subscription
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
      // Don't fail the whole operation, subscription can be added later
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
        plan,
        status,
        trial_days: trialDays,
        owner_created: ownerCreated,
        invite_sent: inviteSent,
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
        subscription: subscription ? {
          plan: subscription.plan,
          status: subscription.status,
          trial_ends_at: subscription.trial_ends_at,
        } : null,
        owner: {
          id: ownerId,
          email: ownerEmail,
          created: ownerCreated,
          invite_sent: inviteSent,
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
