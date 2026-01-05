import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: StatCardProps) => {
  return (
    <Card className={cn('shadow-soft hover:shadow-lg transition-shadow', className)}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
            <p className="text-xs md:text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-xl md:text-2xl font-bold truncate">{value}</p>
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}% গত মাসের তুলনায়
              </p>
            )}
          </div>
          <div
            className={cn(
              'p-2 md:p-3 rounded-xl shrink-0',
              iconClassName || 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5 md:h-6 md:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
