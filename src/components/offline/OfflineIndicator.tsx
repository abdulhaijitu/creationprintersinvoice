import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Check, X, CloudOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const OfflineIndicator = () => {
  const { isOffline, wasOffline, queueLength, isSyncing, syncQueue, isOnline } = useOfflineStatus();
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Show toast when going offline
  useEffect(() => {
    if (isOffline) {
      toast.error('You are offline', {
        description: 'Changes will be saved and synced when you reconnect.',
        duration: 5000,
        icon: <WifiOff className="h-4 w-4" />,
      });
    }
  }, [isOffline]);

  // Show toast when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      toast.success('Back online', {
        description: queueLength > 0 
          ? `Syncing ${queueLength} pending changes...` 
          : 'All caught up!',
        duration: 3000,
      });
    }
  }, [isOnline, wasOffline, queueLength]);

  // Handle manual sync
  const handleSync = async () => {
    const synced = await syncQueue();
    if (synced && synced > 0) {
      setShowSyncSuccess(true);
      toast.success(`Synced ${synced} changes`);
      setTimeout(() => setShowSyncSuccess(false), 2000);
    }
  };

  // Offline banner
  if (isOffline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground">
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
          {queueLength > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {queueLength} pending
            </span>
          )}
        </div>
      </div>
    );
  }

  // Sync indicator when back online with pending changes
  if (isOnline && queueLength > 0) {
    return (
      <div className="fixed bottom-24 md:bottom-4 left-4 z-50 animate-slide-up">
        <div className="bg-card border rounded-xl shadow-lg p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <CloudOff className="h-4 w-4 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {queueLength} pending {queueLength === 1 ? 'change' : 'changes'}
            </p>
            <p className="text-xs text-muted-foreground">
              Waiting to sync
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-8"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Sync success indicator (brief flash)
  if (showSyncSuccess) {
    return (
      <div className="fixed bottom-24 md:bottom-4 left-4 z-50 animate-slide-up">
        <div className="bg-card border rounded-xl shadow-lg p-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Check className="h-4 w-4 text-success" />
          </div>
          <p className="text-sm font-medium text-success">All changes synced</p>
        </div>
      </div>
    );
  }

  return null;
};
