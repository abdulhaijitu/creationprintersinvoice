import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface BackupData {
  version: string;
  created_at: string;
  created_by: string;
  organization_id: string;
  metadata: Record<string, unknown> | null;
  tables: Record<string, unknown[]>;
  record_counts: Record<string, number>;
}

export const useBackupRestore = () => {
  const { organization, isOrgOwner } = useOrganization();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const createBackup = useCallback(async (): Promise<BackupData | null> => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return null;
    }

    if (!isOrgOwner) {
      toast.error('Only organization owners can create backups');
      return null;
    }

    setBackupLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to create a backup');
        return null;
      }

      const response = await supabase.functions.invoke('backup-organization', {
        body: { 
          organization_id: organization.id,
          include_metadata: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Backup failed');
      }

      const backupData = response.data as BackupData;
      
      // Create download
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${organization.slug || organization.id}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup created successfully', {
        description: `${Object.values(backupData.record_counts).reduce((a, b) => a + b, 0)} records backed up`,
      });

      return backupData;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Backup failed', { description: errMsg });
      console.error('Backup error:', error);
      return null;
    } finally {
      setBackupLoading(false);
    }
  }, [organization, isOrgOwner]);

  const restoreBackup = useCallback(async (
    backupData: BackupData,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<boolean> => {
    if (!organization?.id) {
      toast.error('No organization selected');
      return false;
    }

    if (!isOrgOwner) {
      toast.error('Only organization owners can restore backups');
      return false;
    }

    // Validate backup matches current org
    if (backupData.organization_id !== organization.id) {
      toast.error('Backup mismatch', {
        description: 'This backup is from a different organization',
      });
      return false;
    }

    setRestoreLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to restore a backup');
        return false;
      }

      const response = await supabase.functions.invoke('restore-organization', {
        body: { 
          organization_id: organization.id,
          backup_data: backupData,
          mode,
          confirm: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Restore failed');
      }

      const result = response.data;
      
      toast.success('Restore completed', {
        description: `${result.summary.totalRestored} records restored`,
      });

      return true;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Restore failed', { description: errMsg });
      console.error('Restore error:', error);
      return false;
    } finally {
      setRestoreLoading(false);
    }
  }, [organization, isOrgOwner]);

  const parseBackupFile = useCallback((file: File): Promise<BackupData | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as BackupData;
          
          // Basic validation
          if (!data.version || !data.tables || !data.organization_id) {
            toast.error('Invalid backup file format');
            resolve(null);
            return;
          }
          
          resolve(data);
        } catch {
          toast.error('Failed to parse backup file');
          resolve(null);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read backup file');
        resolve(null);
      };
      reader.readAsText(file);
    });
  }, []);

  return {
    createBackup,
    restoreBackup,
    parseBackupFile,
    backupLoading,
    restoreLoading,
    canBackup: isOrgOwner,
    canRestore: isOrgOwner,
  };
};
