import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string | null;
    total: number;
    paid_amount: number;
    customers?: { name: string } | null;
  };
  status: 'paid' | 'partial' | 'due';
  dueAmount: number;
  onView: (id: string) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatusBadge = ({ status }: { status: string }) => {
  const badges: Record<string, JSX.Element> = {
    paid: (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
        <CheckCircle className="w-3 h-3" />
        PAID
      </span>
    ),
    partial: (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
        <Clock className="w-3 h-3" />
        PARTIAL
      </span>
    ),
    due: (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
        <AlertCircle className="w-3 h-3" />
        DUE
      </span>
    ),
  };

  return badges[status] || badges.due;
};

export const InvoiceCard = ({
  invoice,
  status,
  dueAmount,
  onView,
  onDelete,
  canDelete = false,
  isSelected = false,
  onSelect,
}: InvoiceCardProps) => {
  return (
    <Card className={cn('transition-colors', isSelected && 'ring-2 ring-primary')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: Invoice number + Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{invoice.invoice_number}</span>
              <StatusBadge status={status} />
            </div>

            {/* Customer name */}
            <p className="text-sm text-muted-foreground truncate">
              {invoice.customers?.name || 'No Customer'}
            </p>

            {/* Date */}
            <p className="text-xs text-muted-foreground">
              {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
            </p>

            {/* Amount info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium">{formatCurrency(Number(invoice.total))}</span>
              </div>
              {dueAmount > 0 && (
                <div>
                  <span className="text-muted-foreground">Due: </span>
                  <span className="font-medium text-destructive">{formatCurrency(dueAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onView(invoice.id)}>
              <Eye className="w-4 h-4" />
            </Button>
            {(canDelete || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(invoice.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {canDelete && onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(invoice.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceCard;
