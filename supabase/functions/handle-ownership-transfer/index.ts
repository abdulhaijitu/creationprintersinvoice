import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, organizationId, targetUserId, requestId, note, rejectionReason } = body;

    console.log('handle-ownership-transfer:', action, { organizationId, targetUserId, requestId });

    switch (action) {
      // Owner creates a transfer request
      case 'request_transfer': {
        if (!organizationId || !targetUserId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Organization ID and target user ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify requester is the current owner
        const { data: ownerCheck, error: ownerError } = await supabaseAdmin
          .from('organization_members')
          .select('id, role')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .single();

        if (ownerError || ownerCheck?.role !== 'owner') {
          return new Response(
            JSON.stringify({ success: false, error: 'Only the organization owner can request a transfer' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify target user is a member
        const { data: targetMember, error: targetError } = await supabaseAdmin
          .from('organization_members')
          .select('id, user_id')
          .eq('organization_id', organizationId)
          .eq('user_id', targetUserId)
          .single();

        if (targetError || !targetMember) {
          return new Response(
            JSON.stringify({ success: false, error: 'Target user is not a member of this organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cannot transfer to self
        if (targetUserId === user.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot transfer ownership to yourself' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing pending request
        const { data: existingRequest } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .single();

        if (existingRequest) {
          return new Response(
            JSON.stringify({ success: false, error: 'A pending transfer request already exists for this organization' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create transfer request
        const { data: newRequest, error: createError } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .insert({
            organization_id: organizationId,
            requester_id: user.id,
            target_user_id: targetUserId,
            note: note || null,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating transfer request:', createError);
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log to ownership history
        await supabaseAdmin.from('ownership_history').insert({
          organization_id: organizationId,
          action_type: 'transfer_requested',
          previous_owner_id: user.id,
          new_owner_id: targetUserId,
          actor_id: user.id,
          actor_type: 'user',
          transfer_request_id: newRequest.id,
          note: note || null,
        });

        return new Response(
          JSON.stringify({ success: true, request: newRequest }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Super admin approves/rejects transfer request
      case 'review_transfer': {
        if (!requestId || !['approved', 'rejected'].includes(body.decision)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Request ID and decision (approved/rejected) required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify super admin
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || roleData?.role !== 'super_admin') {
          return new Response(
            JSON.stringify({ success: false, error: 'Super Admin privileges required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the transfer request
        const { data: request, error: requestError } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError || !request) {
          return new Response(
            JSON.stringify({ success: false, error: 'Transfer request not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (request.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'This request has already been reviewed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const decision = body.decision as 'approved' | 'rejected';

        // Update request status
        const { error: updateError } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .update({
            status: decision,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: decision === 'rejected' ? (rejectionReason || null) : null,
          })
          .eq('id', requestId);

        if (updateError) {
          console.error('Error updating transfer request:', updateError);
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If approved, perform the ownership transfer
        if (decision === 'approved') {
          // Get current owner's member record
          const { data: currentOwnerMember, error: currentOwnerError } = await supabaseAdmin
            .from('organization_members')
            .select('id')
            .eq('organization_id', request.organization_id)
            .eq('user_id', request.requester_id)
            .single();

          if (currentOwnerError) {
            console.error('Error finding current owner:', currentOwnerError);
          }

          // Get new owner's member record
          const { data: newOwnerMember, error: newOwnerError } = await supabaseAdmin
            .from('organization_members')
            .select('id')
            .eq('organization_id', request.organization_id)
            .eq('user_id', request.target_user_id)
            .single();

          if (newOwnerError || !newOwnerMember) {
            return new Response(
              JSON.stringify({ success: false, error: 'Target user is no longer a member' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Demote current owner to manager
          if (currentOwnerMember) {
            await supabaseAdmin
              .from('organization_members')
              .update({ role: 'manager' })
              .eq('id', currentOwnerMember.id);
          }

          // Promote new owner
          await supabaseAdmin
            .from('organization_members')
            .update({ role: 'owner' })
            .eq('id', newOwnerMember.id);

          // Update organization.owner_id
          const { data: newOwnerProfile } = await supabaseAdmin.auth.admin.getUserById(request.target_user_id);
          await supabaseAdmin
            .from('organizations')
            .update({
              owner_id: request.target_user_id,
              owner_email: newOwnerProfile?.user?.email || null,
            })
            .eq('id', request.organization_id);
        }

        // Log to ownership history
        await supabaseAdmin.from('ownership_history').insert({
          organization_id: request.organization_id,
          action_type: decision === 'approved' ? 'transfer_approved' : 'transfer_rejected',
          previous_owner_id: request.requester_id,
          new_owner_id: decision === 'approved' ? request.target_user_id : null,
          actor_id: user.id,
          actor_type: 'super_admin',
          transfer_request_id: requestId,
          note: decision === 'rejected' ? rejectionReason : null,
        });

        // Log to admin audit
        await supabaseAdmin.from('admin_audit_logs').insert({
          admin_user_id: user.id,
          action: decision === 'approved' ? 'approve_ownership_transfer' : 'reject_ownership_transfer',
          entity_type: 'ownership_transfer_request',
          entity_id: requestId,
          details: {
            organization_id: request.organization_id,
            previous_owner_id: request.requester_id,
            new_owner_id: request.target_user_id,
            rejection_reason: rejectionReason,
          },
        });

        return new Response(
          JSON.stringify({ success: true, decision }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cancel pending transfer request (by owner)
      case 'cancel_transfer': {
        if (!requestId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Request ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get the request
        const { data: request, error: requestError } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError || !request) {
          return new Response(
            JSON.stringify({ success: false, error: 'Transfer request not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify requester is the original owner who made the request
        if (request.requester_id !== user.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Only the requester can cancel this request' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (request.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'This request has already been reviewed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete the request
        await supabaseAdmin
          .from('ownership_transfer_requests')
          .delete()
          .eq('id', requestId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get pending requests (for super admin)
      case 'get_pending_requests': {
        // Verify super admin
        const { data: roleData, error: roleError } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleError || roleData?.role !== 'super_admin') {
          return new Response(
            JSON.stringify({ success: false, error: 'Super Admin privileges required' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: requests, error: fetchError } = await supabaseAdmin
          .from('ownership_transfer_requests')
          .select(`
            *,
            organizations:organization_id(id, name, slug),
            requester:requester_id(id),
            target:target_user_id(id)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (fetchError) {
          return new Response(
            JSON.stringify({ success: false, error: fetchError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get profile info for requester and target
        const enrichedRequests = await Promise.all(
          (requests || []).map(async (req) => {
            const { data: requesterProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('id', req.requester_id)
              .single();

            const { data: targetProfile } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('id', req.target_user_id)
              .single();

            const { data: requesterUser } = await supabaseAdmin.auth.admin.getUserById(req.requester_id);
            const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(req.target_user_id);

            return {
              ...req,
              requester_name: requesterProfile?.full_name || 'Unknown',
              requester_email: requesterUser?.user?.email || 'Unknown',
              target_name: targetProfile?.full_name || 'Unknown',
              target_email: targetUser?.user?.email || 'Unknown',
            };
          })
        );

        return new Response(
          JSON.stringify({ success: true, requests: enrichedRequests }),
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
    console.error('Error in handle-ownership-transfer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
