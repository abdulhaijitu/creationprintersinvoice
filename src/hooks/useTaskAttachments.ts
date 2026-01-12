import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface TaskAttachment {
  id: string;
  task_id: string;
  organization_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function useTaskAttachments(taskId: string | undefined) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const fetchAttachments = useCallback(async () => {
    if (!taskId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments((data as TaskAttachment[]) || []);
    } catch (error) {
      console.error('[TaskAttachments] Error fetching:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not allowed. Allowed types: images (jpg, png), documents (pdf, docx, xlsx)`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds maximum size of 10MB`;
    }
    return null;
  };

  const uploadAttachment = async (file: File): Promise<boolean> => {
    if (!taskId || !user || !organization?.id) {
      toast.error('Unable to upload: missing context');
      return false;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return false;
    }

    const fileId = crypto.randomUUID();
    const fileExt = file.name.split('.').pop() || 'bin';
    const storagePath = `${organization.id}/${taskId}/${fileId}.${fileExt}`;

    setUploading(true);
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

    try {
      // Get user profile info
      let userName = user.email?.split('@')[0] || 'Unknown';
      const { data: profile } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress((prev) => ({ ...prev, [fileId]: 50 }));

      // Create attachment record
      const { error: insertError } = await supabase.from('task_attachments').insert({
        task_id: taskId,
        organization_id: organization.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        uploaded_by: user.id,
        uploaded_by_email: user.email,
        uploaded_by_name: userName,
      });

      if (insertError) {
        // Clean up storage if DB insert fails
        await supabase.storage.from('task-attachments').remove([storagePath]);
        throw insertError;
      }

      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));

      // Refresh attachments
      await fetchAttachments();
      toast.success(`Uploaded "${file.name}"`);
      return true;
    } catch (error) {
      console.error('[TaskAttachments] Upload error:', error);
      toast.error(`Failed to upload "${file.name}"`);
      return false;
    } finally {
      setUploading(false);
      // Clear progress after delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }, 1000);
    }
  };

  const uploadMultiple = async (files: File[]): Promise<number> => {
    let successCount = 0;
    for (const file of files) {
      const success = await uploadAttachment(file);
      if (success) successCount++;
    }
    return successCount;
  };

  const downloadAttachment = async (attachment: TaskAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(attachment.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[TaskAttachments] Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const deleteAttachment = async (attachment: TaskAttachment): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.storage_path]);

      if (storageError) {
        console.warn('[TaskAttachments] Storage delete warning:', storageError);
        // Continue anyway - file might already be deleted
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      // Update local state
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast.success('Attachment deleted');
      return true;
    } catch (error) {
      console.error('[TaskAttachments] Delete error:', error);
      toast.error('Failed to delete attachment');
      return false;
    }
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'doc';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'xls';
    if (fileType.includes('text') || fileType.includes('csv')) return 'txt';
    return 'file';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    attachments,
    loading,
    uploading,
    uploadProgress,
    uploadAttachment,
    uploadMultiple,
    downloadAttachment,
    deleteAttachment,
    getFileIcon,
    formatFileSize,
    refetch: fetchAttachments,
  };
}
