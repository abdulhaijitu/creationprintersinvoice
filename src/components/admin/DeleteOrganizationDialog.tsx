import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_email?: string | null;
  member_count?: number;
}

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onSuccess: () => void;
}

export const DeleteOrganizationDialog = ({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: DeleteOrganizationDialogProps) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [hardDelete, setHardDelete] = useState(false);

  const isConfirmed = confirmName === organization?.name;

  const handleDelete = async () => {
    if (!organization || !isConfirmed) return;

    setError(null);
    setDeleting(true);

    try {
      const response = await supabase.functions.invoke('delete-organization', {
        body: {
          organizationId: organization.id,
          hardDelete,
        }
      });

      const result = await processEdgeFunctionResponse(response);

      if (!result.success || result.error) {
        throw new Error(result.error || 'Failed to delete organization');
      }

      toast.success(
        hardDelete 
          ? 'Organization permanently deleted' 
          : 'Organization deactivated successfully'
      );
      
      onSuccess();
      onOpenChange(false);
      setConfirmName('');
      setHardDelete(false);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete organization';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmName('');
      setHardDelete(false);
      setError(null);
    }
    onOpenChange(isOpen);
  };

  if (!organization) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Organization
          </DialogTitle>
          <DialogDescription>
            This action will remove the organization from the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You are about to delete "{organization.name}".
              {organization.member_count && organization.member_count > 0 && (
                <span className="block mt-1">
                  This organization has {organization.member_count} member(s).
                </span>
              )}
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <strong>{organization.name}</strong> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Enter organization name"
              autoComplete="off"
            />
          </div>

          <div className="flex items-center space-x-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <Checkbox 
              id="hard-delete" 
              checked={hardDelete}
              onCheckedChange={(checked) => setHardDelete(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="hard-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Permanently delete (Hard Delete)
              </label>
              <p className="text-xs text-muted-foreground">
                This will permanently remove all data. Cannot be undone.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">What happens when you delete:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              {hardDelete ? (
                <>
                  <li>Organization record will be permanently removed</li>
                  <li>Owner account will be deleted</li>
                  <li>All members will lose access</li>
                  <li>This cannot be undone</li>
                </>
              ) : (
                <>
                  <li>Subscription will be cancelled</li>
                  <li>Users will lose access to the organization</li>
                  <li>Data will be preserved for recovery</li>
                  <li>Can be reactivated later by Super Admin</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hardDelete ? 'Permanently Delete' : 'Deactivate Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
