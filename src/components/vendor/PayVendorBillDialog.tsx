import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Bill {
  id: string;
  bill_date: string;
  reference_no: string | null;
  amount: number;
  discount: number;
  net_amount: number;
  paid_amount: number;
  status: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface PayVendorBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill;
  vendor: Vendor;
  organizationId: string;
  onPaymentComplete: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank Transfer" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "rocket", label: "Rocket" },
  { value: "cheque", label: "Cheque" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const PayVendorBillDialog = ({
  open,
  onOpenChange,
  bill,
  vendor,
  organizationId,
  onPaymentComplete,
}: PayVendorBillDialogProps) => {
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [payAmount, setPayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate remaining due
  const dueAmount = useMemo(() => {
    return Math.max(0, (bill.net_amount ?? bill.amount) - (bill.paid_amount ?? 0));
  }, [bill]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setPayAmount(dueAmount.toFixed(2)); // Default to full remaining amount
      setPaymentMethod("cash");
      setReferenceNo("");
      setNotes("");
      setError(null);
      setShowSuccess(false);
    }
  }, [open, dueAmount]);

  // Validate payment amount
  useEffect(() => {
    const amount = parseFloat(payAmount) || 0;
    if (amount > dueAmount) {
      setError(`Payment cannot exceed remaining due (${formatCurrency(dueAmount)})`);
    } else if (amount <= 0) {
      setError("Payment amount must be greater than 0");
    } else {
      setError(null);
    }
  }, [payAmount, dueAmount]);

  const handleSubmit = async () => {
    const amount = parseFloat(payAmount) || 0;

    // Final validation
    if (amount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }
    if (amount > dueAmount) {
      toast.error("Payment cannot exceed remaining due amount");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert payment linked to this bill
      const { error: paymentError } = await supabase.from("vendor_payments").insert({
        vendor_id: vendor.id,
        bill_id: bill.id,
        payment_date: paymentDate,
        amount: amount,
        payment_method: paymentMethod,
        reference_no: referenceNo || null,
        notes: notes || null,
        organization_id: organizationId,
      });

      if (paymentError) throw paymentError;

      // The trigger will automatically update paid_amount and status
      setShowSuccess(true);
      toast.success(`Payment of ${formatCurrency(amount)} recorded successfully`);
      
      // Close after brief delay
      setTimeout(() => {
        onOpenChange(false);
        onPaymentComplete();
      }, 1500);
    } catch (err: any) {
      console.error("Error recording payment:", err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mb-4" />
            <h3 className="text-lg font-semibold">Payment Recorded!</h3>
            <p className="text-muted-foreground mt-2">
              {formatCurrency(parseFloat(payAmount))} has been applied to this bill.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay Vendor Bill</DialogTitle>
          <DialogDescription>
            Record a payment for this vendor bill
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bill Summary */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Vendor</span>
              <span className="font-medium">{vendor.name}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Bill Ref#:</span>
                <span className="ml-2 font-medium">
                  {bill.reference_no || `BILL-${bill.id.slice(0, 8)}`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2">{format(new Date(bill.bill_date), "dd MMM yyyy")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Bill Amount:</span>
                <span className="ml-2">{formatCurrency(bill.net_amount ?? bill.amount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="ml-2 text-success">{formatCurrency(bill.paid_amount ?? 0)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-medium">Remaining Due</span>
              <span className="text-lg font-bold text-destructive">
                {formatCurrency(dueAmount)}
              </span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pay Amount *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={dueAmount}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className={error ? "border-destructive" : ""}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Reference No. (Optional)</Label>
              <Input
                placeholder="Transaction/Check #"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment Preview */}
          {!error && parseFloat(payAmount) > 0 && (
            <div className="rounded-lg border bg-success/10 p-3">
              <div className="flex items-center justify-between text-sm">
                <span>After this payment:</span>
                <div className="space-x-2">
                  {parseFloat(payAmount) >= dueAmount ? (
                    <Badge className="bg-success">Fully Paid</Badge>
                  ) : (
                    <Badge variant="secondary">Partially Paid</Badge>
                  )}
                  <span className="font-medium">
                    {formatCurrency(Math.max(0, dueAmount - parseFloat(payAmount)))} remaining
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !!error || !payAmount}
            loading={isSubmitting}
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayVendorBillDialog;
