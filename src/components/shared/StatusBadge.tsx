import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle, Package, Truck, Ban, FileCheck, Send, FileEdit, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 
  | 'paid' | 'partial' | 'unpaid' 
  | 'pending' | 'accepted' | 'rejected' | 'converted' | 'expired'
  | 'draft' | 'sent' | 'dispatched' | 'delivered' | 'cancelled'
  | 'approved';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'primary';
}> = {
  // Invoice statuses
  paid: { label: 'PAID', icon: CheckCircle, variant: 'success' },
  partial: { label: 'PARTIAL', icon: Clock, variant: 'warning' },
  unpaid: { label: 'DUE', icon: XCircle, variant: 'destructive' },
  
  // Quotation statuses
  draft: { label: 'Draft', icon: FileEdit, variant: 'muted' },
  sent: { label: 'Sent', icon: Send, variant: 'info' },
  pending: { label: 'Pending', icon: Clock, variant: 'warning' },
  accepted: { label: 'Accepted', icon: CheckCircle, variant: 'success' },
  rejected: { label: 'Rejected', icon: XCircle, variant: 'destructive' },
  approved: { label: 'Approved', icon: CheckCircle, variant: 'success' },
  converted: { label: 'Converted', icon: FileCheck, variant: 'primary' },
  expired: { label: 'Expired', icon: AlertTriangle, variant: 'warning' },
  
  // Delivery challan statuses
  dispatched: { label: 'Dispatched', icon: Truck, variant: 'info' },
  delivered: { label: 'Delivered', icon: Package, variant: 'success' },
  cancelled: { label: 'Cancelled', icon: Ban, variant: 'destructive' },
};

const variantStyles: Record<string, string> = {
  success: 'bg-success/15 text-success border border-success/25 hover:bg-success/20',
  warning: 'bg-warning/15 text-warning border border-warning/25 hover:bg-warning/20',
  destructive: 'bg-destructive/15 text-destructive border border-destructive/25 hover:bg-destructive/20',
  info: 'bg-info/15 text-info border border-info/25 hover:bg-info/20',
  muted: 'bg-muted text-muted-foreground border border-border hover:bg-muted/80',
  primary: 'bg-primary/15 text-primary border border-primary/25 hover:bg-primary/20',
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
