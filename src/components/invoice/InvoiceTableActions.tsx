import { CheckCircle, Clock, AlertCircle, Send, Trash2, Download, MoreHorizontal, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface InvoiceRowAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface InvoiceTableActionsProps {
  invoiceId: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'due';
  onView: () => void;
  onMarkPaid?: () => void;
  onSendReminder?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  className?: string;
}

export function InvoiceTableActions({
  invoiceId,
  status,
  onView,
  onMarkPaid,
  onSendReminder,
  onDownload,
  onDelete,
  isAdmin = false,
  className,
}: InvoiceTableActionsProps) {
  const canMarkPaid = status !== 'paid';
  const canSendReminder = status !== 'paid';

  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      {/* Quick actions visible on hover */}
      <div className="row-actions flex items-center gap-1">
        {canMarkPaid && onMarkPaid && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
            onClick={(e) => {
              e.stopPropagation();
              onMarkPaid();
            }}
            title="Mark as Paid"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}
        {canSendReminder && onSendReminder && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              onSendReminder();
            }}
            title="Send Reminder"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onView}>
            <Clock className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
          {onDownload && (
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
          )}
          {canMarkPaid && onMarkPaid && (
            <DropdownMenuItem onClick={onMarkPaid}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </DropdownMenuItem>
          )}
          {canSendReminder && onSendReminder && (
            <DropdownMenuItem onClick={onSendReminder}>
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </DropdownMenuItem>
          )}
          {isAdmin && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Invoice
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
