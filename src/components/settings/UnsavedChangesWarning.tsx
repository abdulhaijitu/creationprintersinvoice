import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UnsavedChangesWarningProps {
  open: boolean;
  onDiscard: () => void;
  onContinueEditing: () => void;
  context?: 'navigation' | 'tab-switch';
}

export const UnsavedChangesWarning = ({
  open,
  onDiscard,
  onContinueEditing,
  context = 'navigation',
}: UnsavedChangesWarningProps) => {
  const title = context === 'tab-switch' 
    ? 'Unsaved Changes in This Tab' 
    : 'Unsaved Changes';
    
  const description = context === 'tab-switch'
    ? 'You have unsaved changes in this tab. Switching tabs will discard your changes.'
    : 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.';

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onContinueEditing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onContinueEditing}>
            Continue Editing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
