import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

const PWAInstallButton = ({ 
  variant = 'default', 
  size = 'default',
  className = '',
  showLabel = true 
}: PWAInstallButtonProps) => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else if (canInstall) {
      await promptInstall();
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show button for iOS or when install prompt is available
  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={className}
      >
        <Download className="h-4 w-4" />
        {showLabel && <span className="ml-2">Install App</span>}
      </Button>

      {/* iOS Installation Guide Dialog */}
      <Dialog open={showIOSDialog} onOpenChange={setShowIOSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install on iOS</DialogTitle>
            <DialogDescription>
              Follow these steps to install the app on your iPhone or iPad
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Tap the Share button</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Share className="h-5 w-5" />
                  <span className="text-xs">at the bottom of Safari</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Scroll and tap "Add to Home Screen"</p>
                <p className="text-xs text-muted-foreground">You may need to scroll down in the menu</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Tap "Add" to install</p>
                <p className="text-xs text-muted-foreground">The app will appear on your home screen</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowIOSDialog(false)} className="w-full">
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallButton;
