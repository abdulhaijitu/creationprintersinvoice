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
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
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
              'p-3 rounded-xl',
              iconClassName || 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
