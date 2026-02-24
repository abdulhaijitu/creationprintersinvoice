import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getInitials } from '@/lib/formatters';

interface EmployeePhotoUploadProps {
  employeeId?: string;
  employeeName: string;
  currentPhotoUrl?: string | null;
  organizationId: string;
  onPhotoChange: (url: string | null) => void;
  size?: 'sm' | 'lg';
}

export const EmployeePhotoUpload: React.FC<EmployeePhotoUploadProps> = ({
  employeeId,
  employeeName,
  currentPhotoUrl,
  organizationId,
  onPhotoChange,
  size = 'lg',
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${organizationId}/${employeeId || 'new'}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName);

      setPreviewUrl(publicUrl);
      onPhotoChange(publicUrl);
      toast.success('Photo uploaded');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    onPhotoChange(null);
  };

  const avatarSize = size === 'lg' ? 'h-20 w-20' : 'h-12 w-12';

  return (
    <div className="flex items-center gap-4">
      <div className="relative group">
        <Avatar className={avatarSize}>
          <AvatarImage src={previewUrl || undefined} alt={employeeName} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary text-lg">
            {getInitials(employeeName || '?')}
          </AvatarFallback>
        </Avatar>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</>
          ) : (
            <><Camera className="h-3.5 w-3.5" /> {previewUrl ? 'Change Photo' : 'Add Photo'}</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">Max 2MB, JPG/PNG</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
