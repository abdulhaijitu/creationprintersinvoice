import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UpgradeRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  current_plan: string;
  requested_plan: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
}

export const useUpgradeRequests = () => {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { session } = useAuth();

  const fetchRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plan_upgrade_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      
      setRequests((data || []) as UpgradeRequest[]);
      setPendingCount(data?.filter(r => r.status === 'pending').length || 0);
    } catch (error) {
      console.error('Error fetching upgrade requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRequest = async (requestId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await supabase.functions.invoke('handle-upgrade-request', {
        body: { requestId, action, notes },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      toast.success(action === 'approve' ? 'Plan upgrade approved' : 'Plan upgrade rejected');
      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error handling request:', error);
      toast.error('Failed to process request');
      return false;
    }
  };

  return {
    requests,
    loading,
    pendingCount,
    handleRequest,
    refetch: fetchRequests,
  };
};

// Hook for organization owners to check their pending request
export const useOrgUpgradeRequest = (organizationId: string | null) => {
  const [pendingRequest, setPendingRequest] = useState<UpgradeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const fetchPendingRequest = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('plan_upgrade_requests')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      setPendingRequest(data as UpgradeRequest | null);
    } catch (error) {
      console.error('Error fetching pending request:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPendingRequest();
  }, [fetchPendingRequest]);

  const requestUpgrade = async (requestedPlan: string) => {
    if (!organizationId) return false;

    try {
      const response = await supabase.functions.invoke('request-plan-upgrade', {
        body: { organizationId, requestedPlan },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.error) {
        toast.error(data.error);
        return false;
      }

      toast.success('Upgrade request submitted. Our team will review it shortly.');
      fetchPendingRequest();
      return true;
    } catch (error: any) {
      console.error('Error requesting upgrade:', error);
      toast.error(error.message || 'Failed to submit upgrade request');
      return false;
    }
  };

  return {
    pendingRequest,
    loading,
    requestUpgrade,
    refetch: fetchPendingRequest,
  };
};