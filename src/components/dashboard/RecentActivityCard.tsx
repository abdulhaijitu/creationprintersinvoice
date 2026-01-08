import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface RecentItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusColor?: 'success' | 'warning' | 'destructive' | 'info' | 'muted';
  amount?: string | number;
  date?: string | Date;
  href?: string;
  icon?: LucideIcon;
}

interface RecentActivityCardProps {
  title: string;
  items: RecentItem[];
  emptyMessage?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  maxItems?: number;
}

const statusColorClasses = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

export function RecentActivityCard({
  title,
  items,
  emptyMessage = 'No recent activity',
  viewAllHref,
  viewAllLabel = 'View All',
  className,
  maxItems = 5,
}: RecentActivityCardProps) {
  const navigate = useNavigate();
  const displayItems = items.slice(0, maxItems);

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {viewAllHref && items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(viewAllHref)}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            {viewAllLabel}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {displayItems.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {displayItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-3 py-3 border-b border-border/50 last:border-0',
                    item.href && 'cursor-pointer hover:bg-muted/30 -mx-4 px-4 transition-colors duration-150'
                  )}
                  onClick={() => item.href && navigate(item.href)}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {Icon && (
                    <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status && (
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium',
                        statusColorClasses[item.statusColor || 'muted']
                      )}>
                        {item.status}
                      </span>
                    )}
                    {item.amount && (
                      <span className="text-sm font-semibold tabular-nums">
                        {item.amount}
                      </span>
                    )}
                    {item.date && (
                      <span className="text-xs text-muted-foreground">
                        {typeof item.date === 'string' 
                          ? format(new Date(item.date), 'MMM d')
                          : format(item.date, 'MMM d')
                        }
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
