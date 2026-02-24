import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface EntityAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  uploaded_by: string | null;
  organization_id: string;
  created_at: string;
}

export function useEntityAttachments(entityType: string, entityId: string | undefined) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const queryKey = ['entity-attachments', entityType, entityId];

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!entityId || !organization?.id) return [];
      const { data, error } = await supabase
        .from('entity_attachments' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as EntityAttachment[];
    },
    enabled: !!entityId && !!organization?.id,
  });

  const uploadAttachment = useCallback(async (file: File) => {
    if (!entityId || !organization?.id || !user?.id) {
      toast.error('Missing context for upload');
      return false;
    }

    setUploading(true);
    try {
      const filePath = `${organization.id}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('entity-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('entity_attachments' as any)
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: filePath,
          uploaded_by: user.id,
          organization_id: organization.id,
        });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey });
      toast.success('File uploaded');
      return true;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      return false;
    } finally {
      setUploading(false);
    }
  }, [entityId, entityType, organization?.id, user?.id, queryClient, queryKey]);

  const deleteAttachment = useCallback(async (attachment: EntityAttachment) => {
    try {
      // Delete from storage
      await supabase.storage.from('entity-attachments').remove([attachment.storage_path]);

      // Delete from DB
      const { error } = await supabase
        .from('entity_attachments' as any)
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey });
      toast.success('File deleted');
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
      return false;
    }
  }, [queryClient, queryKey]);

  const getDownloadUrl = useCallback(async (storagePath: string) => {
    const { data } = await supabase.storage
      .from('entity-attachments')
      .createSignedUrl(storagePath, 3600);
    return data?.signedUrl || null;
  }, []);

  return {
    attachments,
    isLoading,
    uploading,
    uploadAttachment,
    deleteAttachment,
    getDownloadUrl,
  };
}
