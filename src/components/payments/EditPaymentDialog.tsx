import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  invoice_id: string;
  invoice?: {
    id: string;
    invoice_number: string;
    total: number;
    paid_amount: number;
    customers: {
      name: string;
    } | null;
  } | null;
}

interface EditPaymentDialogProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdated: () => void;
}

interface PaymentFormData {
  payment_date: string;
  amount: number;
  payment_method: string;
  reference: string;
  notes: string;
}

interface ValidationErrors {
  amount?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function EditPaymentDialog({
  payment,
  open,
  onOpenChange,
  onPaymentUpdated,
}: EditPaymentDialogProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const invoice = payment.invoice;
  const invoiceTotal = Number(invoice?.total || 0);
  const currentPaidAmount = Number(invoice?.paid_amount || 0);
  const originalPaymentAmount = Number(payment.amount);
  
  // Calculate remaining: total due excluding this payment
  const remaining = invoiceTotal - (currentPaidAmount - originalPaymentAmount);

  const [formData, setFormData] = useState<PaymentFormData>({
    payment_date: payment.payment_date,
    amount: originalPaymentAmount,
    payment_method: payment.payment_method || 'cash',
    reference: payment.reference || '',
    notes: payment.notes || '',
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        payment_date: payment.payment_date,
        amount: Number(payment.amount),
        payment_method: payment.payment_method || 'cash',
        reference: payment.reference || '',
        notes: payment.notes || '',
      });
      setErrors({});
      setShowSuccess(false);
    }
  }, [open, payment]);

  // Real-time validation
  useEffect(() => {
    const newErrors: ValidationErrors = {};

    if (formData.amount > 0) {
      if (formData.amount > remaining) {
        newErrors.amount = 'Payment amount cannot exceed due amount';
      }
    }

    setErrors(newErrors);
  }, [formData.amount, remaining]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (formData.amount <= 0) {
      newErrors.amount = 'Enter a valid amount';
    } else if (formData.amount > remaining) {
      newErrors.amount = 'Payment amount cannot exceed due amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('invoice_payments')
        .update({
          payment_date: formData.payment_date,
          amount: formData.amount,
          payment_method: formData.payment_method,
          reference: formData.reference || null,
          notes: formData.notes || null,
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Show success state
      setShowSuccess(true);
      toast.success('Payment updated successfully');

      // Close dialog after brief delay
      setTimeout(() => {
        onOpenChange(false);
        onPaymentUpdated();
      }, 1500);
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.message || 'Failed to update payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentSummary = (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Invoice</span>
        <span className="font-medium">#{invoice?.invoice_number || 'N/A'}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Customer</span>
        <span className="font-medium">{invoice?.customers?.name || 'N/A'}</span>
      </div>
      <Separator className="my-2" />
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Invoice Total</span>
        <span>{formatCurrency(invoiceTotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Original Payment</span>
        <span className="text-success">{formatCurrency(originalPaymentAmount)}</span>
      </div>
      <div className="flex justify-between font-semibold pt-2 border-t">
        <span>Max Allowed</span>
        <span className="text-primary">{formatCurrency(remaining)}</span>
      </div>
    </div>
  );

  const formContent = (
    <div className="space-y-4">
      {paymentSummary}

      <div className="space-y-4 pt-2">
        {/* Payment Date */}
        <div className="space-y-2">
          <Label htmlFor="payment_date">Payment Date</Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>

        {/* Payment Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount</Label>
          <CurrencyInput
            id="amount"
            value={formData.amount}
            onChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
            placeholder="0.00"
            className={cn(errors.amount && 'border-destructive focus-visible:ring-destructive')}
          />
          {errors.amount && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.amount}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="payment_method">Payment Method</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
          >
            <SelectTrigger id="payment_method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reference / Transaction ID */}
        <div className="space-y-2">
          <Label htmlFor="reference">
            Reference / Transaction ID <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="e.g., TRX123456"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );

  const successContent = (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center animate-in zoom-in-50 duration-300">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-lg">Payment Updated</p>
        <p className="text-muted-foreground text-sm">{formatCurrency(formData.amount)} saved</p>
      </div>
    </div>
  );

  const footerButtons = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || Object.keys(errors).length > 0 || formData.amount <= 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </>
  );

  // Mobile: Use Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Payment</DrawerTitle>
            <DrawerDescription>
              Update payment for Invoice #{invoice?.invoice_number || 'N/A'}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto">
            {showSuccess ? successContent : formContent}
          </div>
          {!showSuccess && (
            <DrawerFooter className="pt-4">
              {footerButtons}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            Update payment for Invoice #{invoice?.invoice_number || 'N/A'}
          </DialogDescription>
        </DialogHeader>
        {showSuccess ? successContent : formContent}
        {!showSuccess && (
          <DialogFooter className="gap-2 sm:gap-0">
            {footerButtons}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
