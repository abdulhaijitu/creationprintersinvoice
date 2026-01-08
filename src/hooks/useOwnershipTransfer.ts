import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TransferRequest {
  id: string;
  organization_id: string;
  requester_id: string;
  target_user_id: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  organizations?: { id: string; name: string; slug: string };
  requester_name?: string;
  requester_email?: string;
  target_name?: string;
  target_email?: string;
}

interface OwnershipHistoryEntry {
  id: string;
  organization_id: string;
  action_type: string;
  previous_owner_id: string | null;
  new_owner_id: string | null;
  actor_id: string;
  actor_type: string;
  note: string | null;
  created_at: string;
}

export const useOwnershipTransfer = () => {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const { isSuperAdmin } = useAuth();

  // Get pending request for current org (for org owners)
  const { data: pendingRequest, isLoading: loadingRequest } = useQuery({
    queryKey: ['ownership-request', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      const { data, error } = await supabase
        .from('ownership_transfer_requests')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (error) throw error;
      return data as TransferRequest | null;
    },
    enabled: !!organization?.id,
  });

  // Get ownership history for current org
  const { data: ownershipHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['ownership-history', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('ownership_history')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OwnershipHistoryEntry[];
    },
    enabled: !!organization?.id,
  });

  // Get all pending requests (for super admin)
  const { data: allPendingRequests, isLoading: loadingAllRequests, refetch: refetchPendingRequests } = useQuery({
    queryKey: ['all-ownership-requests'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('handle-ownership-transfer', {
        body: { action: 'get_pending_requests' },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.requests as TransferRequest[];
    },
    enabled: isSuperAdmin,
  });

  // Request ownership transfer
  const requestTransfer = useMutation({
    mutationFn: async ({ targetUserId, note }: { targetUserId: string; note?: string }) => {
      const { data, error } = await supabase.functions.invoke('handle-ownership-transfer', {
        body: {
          action: 'request_transfer',
          organizationId: organization?.id,
          targetUserId,
          note,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Ownership transfer request submitted');
      queryClient.invalidateQueries({ queryKey: ['ownership-request'] });
      queryClient.invalidateQueries({ queryKey: ['ownership-history'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit transfer request');
    },
  });

  // Cancel transfer request
  const cancelTransfer = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke('handle-ownership-transfer', {
        body: { action: 'cancel_transfer', requestId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Transfer request cancelled');
      queryClient.invalidateQueries({ queryKey: ['ownership-request'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel request');
    },
  });

  // Review transfer request (super admin)
  const reviewTransfer = useMutation({
    mutationFn: async ({ 
      requestId, 
      decision, 
      rejectionReason 
    }: { 
      requestId: string; 
      decision: 'approved' | 'rejected';
      rejectionReason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('handle-ownership-transfer', {
        body: { action: 'review_transfer', requestId, decision, rejectionReason },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Transfer request ${variables.decision}`);
      queryClient.invalidateQueries({ queryKey: ['all-ownership-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ownership-history'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to review request');
    },
  });

  return {
    pendingRequest,
    loadingRequest,
    ownershipHistory,
    loadingHistory,
    allPendingRequests,
    loadingAllRequests,
    refetchPendingRequests,
    requestTransfer,
    cancelTransfer,
    reviewTransfer,
  };
};
