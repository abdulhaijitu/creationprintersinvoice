import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  href?: string;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  href,
  className,
  iconClassName,
  valueClassName,
}: StatCardProps) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  const TrendIcon = trend 
    ? trend.value > 0 
      ? TrendingUp 
      : trend.value < 0 
        ? TrendingDown 
        : Minus
    : null;

  return (
    <Card 
      className={cn(
        'stat-card group',
        href && 'cursor-pointer hover:border-primary/30',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={cn(
              "text-xl md:text-2xl font-bold tracking-tight",
              valueClassName
            )}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-1.5 mt-1">
                {TrendIcon && (
                  <TrendIcon className={cn(
                    "h-3.5 w-3.5",
                    trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )} />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-destructive' : 'text-muted-foreground'
                  )}
                >
                  {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              'p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105',
              iconClassName || 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Mini stat for compact display
interface MiniStatProps {
  label: string;
  value: string | number;
  color?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  icon?: LucideIcon;
}

export const MiniStat = ({ label, value, color = 'default', icon: Icon }: MiniStatProps) => {
  const colorClasses = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
    info: 'text-info',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      <span className={cn("font-semibold text-sm", colorClasses[color])}>{value}</span>
    </div>
  );
};
