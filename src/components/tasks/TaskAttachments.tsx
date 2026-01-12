import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import { useTaskAttachments, TaskAttachment } from '@/hooks/useTaskAttachments';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import {
  Upload,
  Download,
  Trash2,
  FileImage,
  FileText,
  File,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskAttachmentsProps {
  taskId: string;
  taskCreatorId?: string | null;
  taskAssigneeId?: string | null;
}

export function TaskAttachments({
  taskId,
  taskCreatorId,
  taskAssigneeId,
}: TaskAttachmentsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { hasPermission } = useOrgRolePermissions();
  const {
    attachments,
    loading,
    uploading,
    uploadProgress,
    uploadMultiple,
    downloadAttachment,
    deleteAttachment,
    getFileIcon,
    formatFileSize,
  } = useTaskAttachments(taskId);

  const [isDragging, setIsDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permission checks
  const canUpload =
    isSuperAdmin ||
    isAdmin ||
    hasPermission('tasks.manage') ||
    user?.id === taskCreatorId ||
    user?.id === taskAssigneeId;

  const canDelete = (attachment: TaskAttachment) =>
    isSuperAdmin ||
    isAdmin ||
    hasPermission('tasks.manage') ||
    attachment.uploaded_by === user?.id;

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (canUpload) setIsDragging(true);
    },
    [canUpload]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!canUpload) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await uploadMultiple(files);
      }
    },
    [canUpload, uploadMultiple]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadMultiple(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteAttachment(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const getFileIconComponent = (fileType: string) => {
    const iconType = getFileIcon(fileType);
    const iconClass = 'h-8 w-8';
    switch (iconType) {
      case 'image':
        return <FileImage className={cn(iconClass, 'text-blue-500')} />;
      case 'pdf':
        return <FileText className={cn(iconClass, 'text-red-500')} />;
      case 'doc':
        return <FileText className={cn(iconClass, 'text-blue-600')} />;
      case 'xls':
        return <FileSpreadsheet className={cn(iconClass, 'text-green-600')} />;
      default:
        return <File className={cn(iconClass, 'text-muted-foreground')} />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUpload && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            uploading && 'pointer-events-none opacity-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
              {Object.entries(uploadProgress).map(([id, progress]) => (
                <Progress key={id} value={progress} className="w-full max-w-xs mx-auto" />
              ))}
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop files here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary hover:underline font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Max 10MB per file. Allowed: images, PDFs, Word, Excel
              </p>
            </>
          )}
        </div>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No attachments yet
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* File Icon */}
              <div className="shrink-0">{getFileIconComponent(attachment.file_type)}</div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)} •{' '}
                  {attachment.uploaded_by_name || attachment.uploaded_by_email || 'Unknown'} •{' '}
                  {formatDistanceToNow(new Date(attachment.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => downloadAttachment(attachment)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete(attachment) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(attachment)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.file_name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
