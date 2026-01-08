import { CheckCircle, Clock, AlertCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'pending';

interface PremiumStatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  pulse?: boolean;
}

const variantConfig: Record<BadgeVariant, {
  icon: React.ElementType;
  classes: string;
}> = {
  success: {
    icon: CheckCircle,
    classes: 'bg-success/10 text-success border-success/20',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-warning/10 text-warning border-warning/20',
  },
  destructive: {
    icon: AlertCircle,
    classes: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  info: {
    icon: Clock,
    classes: 'bg-info/10 text-info border-info/20',
  },
  muted: {
    icon: XCircle,
    classes: 'bg-muted text-muted-foreground border-border',
  },
  pending: {
    icon: Loader2,
    classes: 'bg-primary/10 text-primary border-primary/20',
  },
};

const sizeConfig = {
  sm: {
    badge: 'px-2 py-0.5 text-[10px]',
    icon: 'h-3 w-3',
    gap: 'gap-1',
  },
  default: {
    badge: 'px-2.5 py-1 text-xs',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-2',
  },
};

export function PremiumStatusBadge({
  variant,
  label,
  showIcon = true,
  size = 'default',
  className,
  pulse = false,
}: PremiumStatusBadgeProps) {
  const config = variantConfig[variant];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        'transition-all duration-200',
        config.classes,
        sizes.badge,
        sizes.gap,
        pulse && 'animate-pulse',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          sizes.icon,
          variant === 'pending' && 'animate-spin'
        )} />
      )}
      {label}
    </span>
  );
}

// Pre-configured invoice status badges
export function InvoiceStatusBadge({ status }: { status: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'due' }) {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    paid: { variant: 'success', label: 'Paid' },
    partial: { variant: 'warning', label: 'Partial' },
    unpaid: { variant: 'info', label: 'Unpaid' },
    overdue: { variant: 'destructive', label: 'Overdue' },
    due: { variant: 'warning', label: 'Due' },
  };

  const config = statusMap[status] || statusMap.unpaid;
  return <PremiumStatusBadge variant={config.variant} label={config.label} />;
}

// Pre-configured task status badges
export function TaskStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'muted', label: 'Pending' },
    in_progress: { variant: 'info', label: 'In Progress' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };

  const config = statusMap[status] || { variant: 'muted' as BadgeVariant, label: status };
  return <PremiumStatusBadge variant={config.variant} label={config.label} />;
}
