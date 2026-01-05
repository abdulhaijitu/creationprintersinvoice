import { useState, useEffect } from 'react';
import { History, FileText, Users, Building2, Wallet, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { bn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: unknown;
  created_at: string;
  user_id: string | null;
}

const getEntityIcon = (type: string) => {
  switch (type) {
    case 'invoice':
      return FileText;
    case 'customer':
      return Users;
    case 'vendor':
      return Building2;
    case 'expense':
      return Wallet;
    case 'employee':
      return UserCheck;
    default:
      return History;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'text-success';
    case 'update':
      return 'text-info';
    case 'delete':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

const getActionLabel = (action: string) => {
  switch (action) {
    case 'create':
      return 'Created';
    case 'update':
      return 'Updated';
    case 'delete':
      return 'Deleted';
    default:
      return action;
  }
};

export const RecentActivity = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <History className="h-4 w-4" />
          <span className="sr-only">Recent Activity</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const Icon = getEntityIcon(log.entity_type);
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className={cn('capitalize', getActionColor(log.action))}>
                          {getActionLabel(log.action)}
                        </span>{' '}
                        <span className="capitalize">{log.entity_type}</span>
                      </p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {typeof log.details === 'object' 
                            ? JSON.stringify(log.details).slice(0, 50) 
                            : String(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: bn,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
