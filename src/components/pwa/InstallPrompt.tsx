import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.jpg';

export const InstallPrompt = () => {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Check if user has dismissed the prompt before
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsDismissed(true);
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) return null;

  // Show iOS-specific guide
  if (isIOS) {
    return (
      <>
        {/* iOS Install Banner */}
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
          <div className="bg-card border rounded-xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={logoIcon} alt="PrintoSaas" className="h-8 w-8 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Install PrintoSaas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to your home screen for the best experience
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-1"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full mt-3 h-9"
              onClick={() => setShowIOSGuide(true)}
            >
              How to Install
            </Button>
          </div>
        </div>

        {/* iOS Install Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end md:items-center justify-center p-4">
            <div className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-sm shadow-2xl animate-slide-up">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Install on iPhone/iPad</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowIOSGuide(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tap the Share button</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      Look for <Share className="h-3 w-3" /> at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">Scroll and tap "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      Look for <Plus className="h-3 w-3" /> Add to Home Screen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Tap "Add"</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The app will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowIOSGuide(false);
                    handleDismiss();
                  }}
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/Desktop install prompt
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-card border rounded-xl shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={logoIcon} alt="PrintoSaas" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install PrintoSaas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Install for quick access and offline use
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mt-1 -mr-1"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            className="flex-1 h-9"
            onClick={handleDismiss}
          >
            Not now
          </Button>
          <Button
            className="flex-1 h-9"
            onClick={handleInstall}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};
