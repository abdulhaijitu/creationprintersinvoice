import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DemoDataRecord {
  id: string;
  organization_id: string;
  table_name: string;
  record_id: string;
  created_at: string;
  cleanup_after: string | null;
  cleanup_on_first_real_data: boolean;
}

export interface CleanupLog {
  id: string;
  organization_id: string;
  cleaned_by: string | null;
  records_deleted: number;
  cleanup_reason: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export const useDemoData = (organizationId?: string) => {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demoRecords, setDemoRecords] = useState<DemoDataRecord[]>([]);
  const [cleanupLogs, setCleanupLogs] = useState<CleanupLog[]>([]);

  // Fetch demo data records for an organization
  const fetchDemoRecords = useCallback(async (orgId: string) => {
    if (!isSuperAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demo_data_records')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemoRecords(data || []);
    } catch (error) {
      console.error('Error fetching demo records:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  // Fetch cleanup logs
  const fetchCleanupLogs = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demo_cleanup_logs')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCleanupLogs((data || []) as CleanupLog[]);
    } catch (error) {
      console.error('Error fetching cleanup logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Track a demo record
  const trackDemoRecord = useCallback(async (
    orgId: string,
    tableName: string,
    recordId: string,
    options?: {
      cleanupAfterDays?: number;
      cleanupOnFirstRealData?: boolean;
    }
  ) => {
    if (!isSuperAdmin) return;

    try {
      const cleanupAfter = options?.cleanupAfterDays
        ? new Date(Date.now() + options.cleanupAfterDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase.from('demo_data_records').insert({
        organization_id: orgId,
        table_name: tableName,
        record_id: recordId,
        cleanup_after: cleanupAfter,
        cleanup_on_first_real_data: options?.cleanupOnFirstRealData || false,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking demo record:', error);
    }
  }, [isSuperAdmin]);

  // Cleanup demo data for an organization
  const cleanupDemoData = useCallback(async (
    orgId: string,
    reason: 'manual' | 'time_based' | 'first_real_data'
  ) => {
    if (!isSuperAdmin || !user?.id) {
      toast.error('Only super admins can cleanup demo data');
      return { success: false, deletedCount: 0 };
    }

    setLoading(true);
    try {
      // Get all demo records for the org
      const { data: records, error: fetchError } = await supabase
        .from('demo_data_records')
        .select('*')
        .eq('organization_id', orgId);

      if (fetchError) throw fetchError;

      if (!records || records.length === 0) {
        toast.info('No demo data to cleanup');
        return { success: true, deletedCount: 0 };
      }

      let deletedCount = 0;
      const deletedDetails: Record<string, number> = {};

      // Group by table and delete
      const recordsByTable = records.reduce((acc, record) => {
        if (!acc[record.table_name]) {
          acc[record.table_name] = [];
        }
        acc[record.table_name].push(record.record_id);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [tableName, recordIds] of Object.entries(recordsByTable)) {
        try {
          const { error: deleteError } = await supabase
            .from(tableName as keyof Database['public']['Tables'])
            .delete()
            .in('id', recordIds);

          if (!deleteError) {
            deletedCount += recordIds.length;
            deletedDetails[tableName] = recordIds.length;
          }
        } catch (err) {
          console.error(`Error deleting from ${tableName}:`, err);
        }
      }

      // Remove tracking records
      await supabase
        .from('demo_data_records')
        .delete()
        .eq('organization_id', orgId);

      // Log the cleanup
      await supabase.from('demo_cleanup_logs').insert({
        organization_id: orgId,
        cleaned_by: user.id,
        records_deleted: deletedCount,
        cleanup_reason: reason,
        details: deletedDetails,
      });

      toast.success(`Cleaned up ${deletedCount} demo records`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up demo data:', error);
      toast.error('Failed to cleanup demo data');
      return { success: false, deletedCount: 0 };
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user?.id]);

  // Check if org has demo data
  const hasDemoData = useCallback(async (orgId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('demo_data_records')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    if (error) return false;
    return (data?.length || 0) > 0;
  }, []);

  // Trigger cleanup on first real data (call this when real data is created)
  const checkAndCleanupOnRealData = useCallback(async (orgId: string) => {
    const { data: records } = await supabase
      .from('demo_data_records')
      .select('*')
      .eq('organization_id', orgId)
      .eq('cleanup_on_first_real_data', true);

    if (records && records.length > 0) {
      // There's demo data that should be cleaned on first real data
      await cleanupDemoData(orgId, 'first_real_data');
    }
  }, [cleanupDemoData]);

  return {
    loading,
    demoRecords,
    cleanupLogs,
    fetchDemoRecords,
    fetchCleanupLogs,
    trackDemoRecord,
    cleanupDemoData,
    hasDemoData,
    checkAndCleanupOnRealData,
  };
};

// Type helper for database tables
type Database = {
  public: {
    Tables: {
      customers: unknown;
      invoices: unknown;
      quotations: unknown;
      employees: unknown;
      expenses: unknown;
      vendors: unknown;
    };
  };
};
