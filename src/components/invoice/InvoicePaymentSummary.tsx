import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Download, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  CalendarDays,
  Building2,
  User,
  FileText,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InvoicePaymentSummaryProps {
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    due_date?: string | null;
    invoice_date: string;
    status: string;
    customer?: {
      name: string;
      email?: string | null;
      phone?: string | null;
    } | null;
  };
  payments?: Array<{
    id: string;
    amount: number;
    payment_date: string;
    payment_method?: string | null;
    reference?: string | null;
  }>;
  onAddPayment?: () => void;
  onPayNow?: () => void;
  onDownloadPDF?: () => void;
  onPrint?: () => void;
  onSendReminder?: () => void;
  formatCurrency: (amount: number) => string;
  className?: string;
}

export function InvoicePaymentSummary({
  invoice,
  payments = [],
  onAddPayment,
  onPayNow,
  onDownloadPDF,
  onPrint,
  onSendReminder,
  formatCurrency,
  className,
}: InvoicePaymentSummaryProps) {
  const dueAmount = Number(invoice.total) - Number(invoice.paid_amount || 0);
  const isPaid = dueAmount <= 0;
  const isOverdue = !isPaid && invoice.due_date && new Date(invoice.due_date) < new Date();
  const isPartial = !isPaid && Number(invoice.paid_amount || 0) > 0;

  const getStatusConfig = () => {
    if (isPaid) {
      return { label: 'Paid', icon: CheckCircle, variant: 'success' as const };
    }
    if (isOverdue) {
      return { label: 'Overdue', icon: AlertCircle, variant: 'destructive' as const };
    }
    if (isPartial) {
      return { label: 'Partial', icon: Clock, variant: 'warning' as const };
    }
    return { label: 'Due', icon: Clock, variant: 'info' as const };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const statusClasses = {
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-info/10 text-info border-info/20',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header with Status */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Payment Summary</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Invoice #{invoice.invoice_number}
            </p>
          </div>
          <Badge className={cn(
            'gap-1.5 px-2.5 py-1',
            statusClasses[statusConfig.variant]
          )}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Amount Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-medium tabular-nums">{formatCurrency(Number(invoice.total))}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium text-success tabular-nums">
              {formatCurrency(Number(invoice.paid_amount || 0))}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium">Amount Due</span>
            <span className={cn(
              'text-lg font-bold tabular-nums',
              isPaid ? 'text-success' : isOverdue ? 'text-destructive' : 'text-foreground'
            )}>
              {formatCurrency(dueAmount)}
            </span>
          </div>
        </div>

        {/* Due Date */}
        {invoice.due_date && (
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-lg',
            isOverdue ? 'bg-destructive/5' : 'bg-muted/30'
          )}>
            <CalendarDays className={cn(
              'h-5 w-5',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )} />
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className={cn(
                'text-sm font-medium',
                isOverdue && 'text-destructive'
              )}>
                {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {!isPaid && onPayNow && (
            <Button 
              className="w-full gap-2 shadow-sm"
              onClick={onPayNow}
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Button>
          )}
          {!isPaid && onAddPayment && (
            <Button 
              variant="outline"
              className="w-full gap-2"
              onClick={onAddPayment}
            >
              <CheckCircle className="h-4 w-4" />
              Record Payment
            </Button>
          )}
          <div className="flex gap-2">
            {onDownloadPDF && (
              <Button 
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onDownloadPDF}
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
            )}
            {onPrint && (
              <Button 
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onPrint}
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            )}
          </div>
          {!isPaid && onSendReminder && (
            <Button 
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={onSendReminder}
            >
              <Send className="h-4 w-4" />
              Send Reminder
            </Button>
          )}
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <h4 className="text-sm font-medium mb-3">Payment History</h4>
            <div className="space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.payment_method || 'Payment'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
