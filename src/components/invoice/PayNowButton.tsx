import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { cn } from '@/lib/utils';

interface PayNowButtonProps {
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    customers?: { name: string; email?: string } | null;
  };
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(amount);
};

export function PayNowButton({ invoice, className, variant = 'default', size = 'default' }: PayNowButtonProps) {
  const [open, setOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const { loading, initiatePayment } = useUddoktaPay();

  const dueAmount = Number(invoice.total) - Number(invoice.paid_amount);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setPaymentAmount(dueAmount);
    }
  };

  const handlePay = async () => {
    if (paymentAmount <= 0 || paymentAmount > dueAmount) return;

    await initiatePayment({
      invoiceId: invoice.id,
      amount: paymentAmount,
      fullName: invoice.customers?.name,
      email: invoice.customers?.email,
    });
  };

  if (dueAmount <= 0) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={() => handleOpenChange(true)}
      >
        <CreditCard className="h-4 w-4" />
        Pay Now
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Invoice</DialogTitle>
            <DialogDescription>
              Complete payment for Invoice #{invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invoice Summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Total</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="text-success">{formatCurrency(Number(invoice.paid_amount))}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Due Amount</span>
                <span className="text-destructive">{formatCurrency(dueAmount)}</span>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="payment_amount">Payment Amount</Label>
              <CurrencyInput
                id="payment_amount"
                value={paymentAmount}
                onChange={setPaymentAmount}
                placeholder="0.00"
                max={dueAmount}
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(dueAmount)}
              </p>
            </div>

            {/* Payment Info */}
            <div className="rounded-lg border border-info/20 bg-info/5 p-3">
              <p className="text-sm text-info flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                You'll be redirected to UddoktaPay for secure payment
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handlePay}
              disabled={loading || paymentAmount <= 0 || paymentAmount > dueAmount}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay {formatCurrency(paymentAmount)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
