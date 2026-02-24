import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ApprovalRequest {
  id: string;
  request_type: string;
  entity_id: string;
  entity_name: string | null;
  amount: number | null;
  requested_by: string;
  requested_by_name: string | null;
  approved_by: string | null;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export function useApprovalRequests(filterStatus?: string) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const queryKey = ['approval-requests', organization?.id, filterStatus];

  const { data: requests = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organization?.id) return [];
      let query = supabase
        .from('approval_requests' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ApprovalRequest[];
    },
    enabled: !!organization?.id,
  });

  const createRequest = useCallback(async (data: {
    request_type: string;
    entity_id: string;
    entity_name?: string;
    amount?: number;
    notes?: string;
  }) => {
    if (!organization?.id || !user?.id) return false;

    try {
      const { error } = await supabase
        .from('approval_requests' as any)
        .insert({
          request_type: data.request_type,
          entity_id: data.entity_id,
          entity_name: data.entity_name || null,
          amount: data.amount || null,
          requested_by: user.id,
          requested_by_name: user.email,
          notes: data.notes || null,
          organization_id: organization.id,
        });

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast.success('Approval request submitted');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
      return false;
    }
  }, [organization?.id, user?.id, user?.email, queryClient]);

  const approveRequest = useCallback(async (requestId: string) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('approval_requests' as any)
        .update({ status: 'approved', approved_by: user.id })
        .eq('id', requestId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast.success('Request approved');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
      return false;
    }
  }, [user?.id, queryClient]);

  const rejectRequest = useCallback(async (requestId: string, reason?: string) => {
    if (!user?.id) return false;
    try {
      const { error } = await supabase
        .from('approval_requests' as any)
        .update({ status: 'rejected', approved_by: user.id, rejection_reason: reason || null })
        .eq('id', requestId);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['approval-requests'] });
      toast.success('Request rejected');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
      return false;
    }
  }, [user?.id, queryClient]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    requests,
    isLoading,
    pendingCount,
    createRequest,
    approveRequest,
    rejectRequest,
  };
}
