import { useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserX, UserCheck } from 'lucide-react';

interface UserActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'enable' | 'disable' | null;
  user: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  onSuccess: () => void;
}

export const UserActionsDialog = ({
  open,
  onOpenChange,
  action,
  user,
  onSuccess,
}: UserActionsDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!user || !action) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Authentication required');
        return;
      }

      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action,
          userId: user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || `Failed to ${action} user`);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || `Failed to ${action} user`);
      }

      toast.success(`User ${action === 'disable' ? 'disabled' : 'enabled'} successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} user`);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !action) return null;

  const isDisable = action === 'disable';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isDisable ? (
              <UserX className="h-5 w-5 text-destructive" />
            ) : (
              <UserCheck className="h-5 w-5 text-green-600" />
            )}
            {isDisable ? 'Disable User Account' : 'Enable User Account'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDisable ? (
              <>
                Are you sure you want to disable <span className="font-medium">{user.full_name || user.email}</span>?
                They will not be able to log in until re-enabled.
              </>
            ) : (
              <>
                Are you sure you want to enable <span className="font-medium">{user.full_name || user.email}</span>?
                They will be able to log in again.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={isDisable ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDisable ? 'Disable User' : 'Enable User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
