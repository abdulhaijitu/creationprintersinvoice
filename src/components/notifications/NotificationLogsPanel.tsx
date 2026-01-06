import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Phone, MessageSquare, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import {
  useNotificationLogs,
  NotificationChannel,
  NotificationStatus,
  NOTIFICATION_TYPE_LABELS,
} from '@/hooks/useNotificationSettings';

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
};

const statusConfig: Record<NotificationStatus, { icon: React.ReactNode; color: string; label: string }> = {
  sent: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600', label: 'Sent' },
  failed: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', label: 'Failed' },
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600', label: 'Pending' },
  cancelled: { icon: <XCircle className="h-4 w-4" />, color: 'text-muted-foreground', label: 'Cancelled' },
};

export const NotificationLogsPanel = () => {
  const { logs, loading } = useNotificationLogs();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg mb-2">No notification history</h3>
          <p className="text-muted-foreground">
            Your notification history will appear here once notifications are sent.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Notification History
        </CardTitle>
        <CardDescription>
          Recent notifications sent to your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {logs.map(log => {
              const status = statusConfig[log.status];
              
              return (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-muted-foreground">
                          {channelIcons[log.channel]}
                        </span>
                        <span className="font-medium truncate">
                          {NOTIFICATION_TYPE_LABELS[log.notification_type] || log.notification_type}
                        </span>
                      </div>
                      {log.subject && (
                        <p className="text-sm text-muted-foreground truncate mb-1">
                          {log.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        To: {log.recipient}
                      </p>
                      {log.failed_reason && (
                        <p className="text-sm text-red-600 mt-1">
                          Error: {log.failed_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`flex items-center gap-1 ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {log.retry_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Retries: {log.retry_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
