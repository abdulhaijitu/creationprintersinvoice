import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, Upload, Trash2, Download, FileIcon, Loader2 } from 'lucide-react';
import { useEntityAttachments, type EntityAttachment } from '@/hooks/useEntityAttachments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EntityAttachmentsSectionProps {
  entityType: string;
  entityId: string | undefined;
  canUpload?: boolean;
  canDelete?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EntityAttachmentsSection({ entityType, entityId, canUpload = true, canDelete = true }: EntityAttachmentsSectionProps) {
  const { attachments, isLoading, uploading, uploadAttachment, deleteAttachment, getDownloadUrl } = useEntityAttachments(entityType, entityId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }
    await uploadAttachment(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (att: EntityAttachment) => {
    const url = await getDownloadUrl(att.storage_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!entityId) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground">({attachments.length})</span>
            )}
          </CardTitle>
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="*/*"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Upload
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(att.file_size)}
                      {att.created_at && ` · ${format(new Date(att.created_at), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(att)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAttachment(att)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
