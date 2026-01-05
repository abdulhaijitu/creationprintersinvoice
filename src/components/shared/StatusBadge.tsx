import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, Package, Truck, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 
  | 'paid' | 'partial' | 'unpaid' 
  | 'pending' | 'accepted' | 'rejected'
  | 'draft' | 'dispatched' | 'delivered' | 'cancelled'
  | 'approved';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'success' | 'warning' | 'destructive' | 'info' | 'muted';
}> = {
  // Invoice statuses
  paid: { label: 'Paid', icon: CheckCircle, variant: 'success' },
  partial: { label: 'Partial', icon: Clock, variant: 'warning' },
  unpaid: { label: 'Unpaid', icon: XCircle, variant: 'destructive' },
  
  // Quotation statuses
  pending: { label: 'Pending', icon: Clock, variant: 'warning' },
  accepted: { label: 'Accepted', icon: CheckCircle, variant: 'success' },
  rejected: { label: 'Rejected', icon: XCircle, variant: 'destructive' },
  approved: { label: 'Approved', icon: CheckCircle, variant: 'success' },
  
  // Delivery challan statuses
  draft: { label: 'Draft', icon: AlertCircle, variant: 'muted' },
  dispatched: { label: 'Dispatched', icon: Truck, variant: 'info' },
  delivered: { label: 'Delivered', icon: Package, variant: 'success' },
  cancelled: { label: 'Cancelled', icon: Ban, variant: 'destructive' },
};

const variantStyles: Record<string, string> = {
  success: 'bg-success/10 text-success border-0 hover:bg-success/15',
  warning: 'bg-warning/10 text-warning border-0 hover:bg-warning/15',
  destructive: 'bg-destructive/10 text-destructive border-0 hover:bg-destructive/15',
  info: 'bg-info/10 text-info border-0 hover:bg-info/15',
  muted: 'bg-muted/50 text-muted-foreground border-0 hover:bg-muted/70',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    icon: AlertCircle,
    variant: 'muted' as const,
  };

  const Icon = config.icon;

  return (
    <Badge 
      className={cn(
        'font-medium transition-colors duration-200',
        variantStyles[config.variant],
        className
      )}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
