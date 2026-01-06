import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Mail,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Send,
} from 'lucide-react';
import {
  useAdminNotificationLogs,
  NotificationChannel,
  NotificationStatus,
  NOTIFICATION_TYPE_LABELS,
} from '@/hooks/useNotificationSettings';

const channelIcons: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <Phone className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
};

const statusConfig: Record<NotificationStatus, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  sent: { icon: <CheckCircle className="h-4 w-4" />, variant: 'default', label: 'Sent' },
  failed: { icon: <XCircle className="h-4 w-4" />, variant: 'destructive', label: 'Failed' },
  pending: { icon: <Clock className="h-4 w-4" />, variant: 'secondary', label: 'Pending' },
  cancelled: { icon: <XCircle className="h-4 w-4" />, variant: 'outline', label: 'Cancelled' },
};

export const AdminNotificationLogs = () => {
  const { logs, loading, stats, fetchLogs, retryNotification } = useAdminNotificationLogs();
  const [filters, setFilters] = useState<{
    status?: NotificationStatus;
    channel?: NotificationChannel;
    dateFrom?: string;
    dateTo?: string;
  }>({});
  const [retrying, setRetrying] = useState<string | null>(null);

  const handleRetry = async (logId: string) => {
    setRetrying(logId);
    await retryNotification(logId);
    setRetrying(null);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    setFilters(newFilters);
    fetchLogs(newFilters);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select
                value={filters.channel || 'all'}
                onValueChange={(value) => handleFilterChange('channel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Logs</CardTitle>
          <CardDescription>
            All notifications sent across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No notifications found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => {
                    const status = statusConfig[log.status];
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          {log.organization?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {NOTIFICATION_TYPE_LABELS[log.notification_type] || log.notification_type}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {channelIcons[log.channel]}
                            <span className="capitalize">{log.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.recipient}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            {status.icon}
                            {status.label}
                          </Badge>
                          {log.failed_reason && (
                            <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate">
                              {log.failed_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.status === 'failed' && log.retry_count < 3 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(log.id)}
                              disabled={retrying === log.id}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${retrying === log.id ? 'animate-spin' : ''}`} />
                              Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
