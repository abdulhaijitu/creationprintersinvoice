import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled';

interface ChallanStatusBadgeProps {
  status: ChallanStatus;
  className?: string;
}

const statusConfig: Record<ChallanStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground hover:bg-muted/80',
  },
  dispatched: {
    label: 'Dispatched',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  },
};

export function ChallanStatusBadge({ status, className }: ChallanStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="secondary"
      className={cn(
        'transition-colors duration-200',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
