import { Button } from '@/components/ui/button';
import { X, Trash2, CheckCircle, Send, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: () => void;
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'bg-card border border-border/50 shadow-lg rounded-xl',
        'px-4 py-3 flex items-center gap-3',
        'animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
        className
      )}
    >
      <div className="flex items-center gap-2 pr-3 border-r border-border/50">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              className="h-8 gap-1.5"
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Pre-configured bulk actions for different modules
export const getInvoiceBulkActions = (
  onMarkPaid: () => void,
  onDelete: () => void,
  onSendReminder: () => void,
  isAdmin: boolean
): BulkAction[] => [
  {
    id: 'mark-paid',
    label: 'Mark Paid',
    icon: CheckCircle,
    onClick: onMarkPaid,
  },
  {
    id: 'send-reminder',
    label: 'Send Reminder',
    icon: Send,
    onClick: onSendReminder,
  },
  ...(isAdmin
    ? [
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive' as const,
          onClick: onDelete,
        },
      ]
    : []),
];

export const getCustomerBulkActions = (
  onDelete: () => void,
  onExport: () => void,
  isAdmin: boolean
): BulkAction[] => [
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    onClick: onExport,
  },
  ...(isAdmin
    ? [
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive' as const,
          onClick: onDelete,
        },
      ]
    : []),
];

export const getQuotationBulkActions = (
  onConvertToInvoice: () => void,
  onDelete: () => void,
  isAdmin: boolean
): BulkAction[] => [
  {
    id: 'convert',
    label: 'Convert to Invoice',
    icon: FileText,
    onClick: onConvertToInvoice,
  },
  ...(isAdmin
    ? [
        {
          id: 'delete',
          label: 'Delete',
          icon: Trash2,
          variant: 'destructive' as const,
          onClick: onDelete,
        },
      ]
    : []),
];
