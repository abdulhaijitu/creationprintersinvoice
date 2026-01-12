import React, { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, UserMinus } from 'lucide-react';
import { OrgRole } from '@/lib/permissions/constants';

interface DeleteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    user_id: string;
    role: OrgRole;
    profile?: {
      full_name: string;
    } | null;
  } | null;
  isLastAdmin: boolean;
  onConfirm: (memberId: string) => Promise<void>;
}

export const DeleteMemberDialog: React.FC<DeleteMemberDialogProps> = ({
  open,
  onOpenChange,
  member,
  isLastAdmin,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const memberName = member?.profile?.full_name || 'this member';
  const expectedConfirmText = 'DELETE';
  const canDelete = confirmText === expectedConfirmText && !isLastAdmin;

  const handleConfirm = async () => {
    if (!member || !canDelete) return;

    setIsDeleting(true);
    try {
      await onConfirm(member.id);
      onOpenChange(false);
      setConfirmText('');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmText('');
    }
    onOpenChange(newOpen);
  };

  if (!member) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <UserMinus className="h-5 w-5" />
            Remove Team Member
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to remove <strong>{memberName}</strong> from your organization?
            </p>
            <p className="text-muted-foreground">
              This action will revoke their access immediately. They will no longer be able to log
              in or access any organization data.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {isLastAdmin && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Cannot remove:</strong> This is the only manager/admin in the organization.
                At least one manager must exist to manage the team.
              </AlertDescription>
            </Alert>
          )}

          {!isLastAdmin && (
            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="text-sm">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                disabled={isDeleting}
                className="font-mono"
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <UserMinus className="h-4 w-4 mr-2" />
                Remove Member
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMemberDialog;
