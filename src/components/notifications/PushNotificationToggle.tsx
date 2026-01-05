import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const PushNotificationToggle = () => {
  const { isSupported, isSubscribed, permission, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.info('Push notifications disabled');
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled', {
          description: 'You will receive alerts for invoice reminders, task deadlines, and leave approvals.',
        });
      } else if (permission === 'denied') {
        toast.error('Notifications blocked', {
          description: 'Please enable notifications in your browser settings.',
        });
      }
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          disabled={loading || permission === 'denied'}
          className="relative"
        >
          {isSubscribed ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : permission === 'denied' ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {isSubscribed && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-success" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isSubscribed
          ? 'Push notifications enabled'
          : permission === 'denied'
          ? 'Notifications blocked in browser'
          : 'Enable push notifications'}
      </TooltipContent>
    </Tooltip>
  );
};
