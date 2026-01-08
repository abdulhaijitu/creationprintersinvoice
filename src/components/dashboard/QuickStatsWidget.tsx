import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiniStatItem {
  label: string;
  value: string | number;
  color?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

interface QuickStatsWidgetProps {
  title: string;
  icon?: LucideIcon;
  items: MiniStatItem[];
  className?: string;
}

const colorClasses = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
};

export function QuickStatsWidget({ title, icon: Icon, items, className }: QuickStatsWidgetProps) {
  return (
    <Card className={cn('transition-all duration-200 hover:shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className={cn(
                'font-semibold text-sm tabular-nums',
                colorClasses[item.color || 'default']
              )}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
