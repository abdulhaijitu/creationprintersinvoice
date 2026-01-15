import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { processEdgeFunctionResponse } from '@/lib/edgeFunctionUtils';
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  paid_amount: number;
  due_date: string | null;
  customers: {
    id: string;
    name: string;
  } | null;
}

interface AddPaymentFromListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentAdded: () => void;
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
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function AddPaymentFromListDialog({
  open,
  onOpenChange,
  onPaymentAdded,
}: AddPaymentFromListDialogProps) {
  const { organization } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string }>({});

  const [formData, setFormData] = useState({
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    payment_method: 'cash',
    reference: '',
    notes: '',
  });

  // Fetch unpaid/partial invoices
  useEffect(() => {
    if (open && organization?.id) {
      fetchInvoices();
    }
  }, [open, organization?.id]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedInvoice(null);
      setSearchQuery('');
      setFormData({
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        amount: 0,
        payment_method: 'cash',
        reference: '',
        notes: '',
      });
      setErrors({});
      setShowSuccess(false);
    }
  }, [open]);

  const fetchInvoices = async () => {
    if (!organization?.id) return;
    setLoadingInvoices(true);

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total, paid_amount, due_date, customers(id, name)')
        .eq('organization_id', organization.id)
        .in('status', ['unpaid', 'partial'])
        .order('invoice_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const remaining = selectedInvoice
    ? Number(selectedInvoice.total) - Number(selectedInvoice.paid_amount)
    : 0;

  // Real-time validation
  useEffect(() => {
    const newErrors: { amount?: string } = {};

    if (formData.amount > 0 && selectedInvoice) {
      if (formData.amount > remaining) {
        newErrors.amount = 'Payment cannot exceed due amount';
      }
    }

    setErrors(newErrors);
  }, [formData.amount, remaining, selectedInvoice]);

  const validateForm = (): boolean => {
    const newErrors: { amount?: string } = {};

    if (!selectedInvoice) {
      toast.error('Please select an invoice');
      return false;
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Enter a valid amount';
    } else if (formData.amount > remaining) {
      newErrors.amount = 'Payment cannot exceed due amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedInvoice) return;

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('record-invoice-payment', {
        body: {
          invoice_id: selectedInvoice.id,
          amount: formData.amount,
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
          reference: formData.reference || null,
          notes: formData.notes || null,
        },
      });

      const result = await processEdgeFunctionResponse(response);

      if (!result.success) {
        throw new Error(result.error || 'Failed to record payment');
      }

      setShowSuccess(true);
      toast.success('Payment recorded successfully');

      setTimeout(() => {
        onOpenChange(false);
        onPaymentAdded();
      }, 1500);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const successContent = (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center animate-in zoom-in-50 duration-300">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-lg">Payment Recorded</p>
        <p className="text-muted-foreground text-sm">{formatCurrency(formData.amount)} has been added</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>Record a payment for an invoice</DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          successContent
        ) : (
          <div className="space-y-4">
            {/* Invoice Selection */}
            <div className="space-y-2">
              <Label>Select Invoice</Label>
              {loadingInvoices ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search invoice or customer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={selectedInvoice?.id || ''}
                    onValueChange={(id) => {
                      const inv = invoices.find((i) => i.id === id);
                      setSelectedInvoice(inv || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an invoice..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {filteredInvoices.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No unpaid invoices found
                        </div>
                      ) : (
                        filteredInvoices.map((inv) => {
                          const due = Number(inv.total) - Number(inv.paid_amount);
                          return (
                            <SelectItem key={inv.id} value={inv.id}>
                              <div className="flex justify-between items-center w-full gap-4">
                                <span className="font-medium">{inv.invoice_number}</span>
                                <span className="text-muted-foreground text-xs">
                                  {inv.customers?.name || 'N/A'}
                                </span>
                                <span className="text-destructive text-xs">
                                  Due: {formatCurrency(due)}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Invoice Summary */}
            {selectedInvoice && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">#{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedInvoice.customers?.name || 'N/A'}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice Total</span>
                  <span>{formatCurrency(Number(selectedInvoice.total))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-success">
                    {formatCurrency(Number(selectedInvoice.paid_amount))}
                  </span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Remaining Due</span>
                  <span className="text-destructive">{formatCurrency(remaining)}</span>
                </div>
              </div>
            )}

            {/* Payment Form */}
            {selectedInvoice && (
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

                {/* Reference */}
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference (optional)</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="e.g., TRX123456"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!showSuccess && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedInvoice || Object.keys(errors).length > 0 || formData.amount <= 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
