import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, MoreHorizontal, RotateCcw, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PaymentCardProps {
  payment: {
    id: string;
    payment_date: string;
    amount: number;
    payment_method?: string | null;
    reference?: string | null;
    invoice?: {
      id: string;
      invoice_number: string;
      total: number;
      paid_amount: number;
      due_date?: string | null;
      customers?: { name: string } | null;
    };
  };
  status: 'paid' | 'partial' | 'due' | 'unknown';
  balanceDue: number;
  onViewInvoice: (invoiceId: string) => void;
  onRefund?: (paymentId: string) => void;
  canRefund?: boolean;
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
    unknown: (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        Unknown
      </span>
    ),
  };

  return badges[status] || badges.unknown;
};

export const PaymentCard = ({
  payment,
  status,
  balanceDue,
  onViewInvoice,
  onRefund,
  canRefund = false,
}: PaymentCardProps) => {
  const invoice = payment.invoice;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: Invoice number + Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {invoice?.invoice_number || 'N/A'}
              </span>
              <StatusBadge status={status} />
            </div>

            {/* Customer name */}
            <p className="text-sm text-muted-foreground truncate">
              {invoice?.customers?.name || 'No Customer'}
            </p>

            {/* Payment date + method */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{format(parseISO(payment.payment_date), 'dd MMM yyyy')}</span>
              {payment.payment_method && (
                <span className="capitalize">• {payment.payment_method}</span>
              )}
            </div>

            {/* Amount info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Paid: </span>
                <span className="font-medium text-success">{formatCurrency(Number(payment.amount))}</span>
              </div>
              {balanceDue > 0 && (
                <div>
                  <span className="text-muted-foreground">Due: </span>
                  <span className="font-medium text-destructive">{formatCurrency(balanceDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => invoice?.id && onViewInvoice(invoice.id)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {canRefund && onRefund && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => invoice?.id && onViewInvoice(invoice.id)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRefund(payment.id)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Refund
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentCard;
