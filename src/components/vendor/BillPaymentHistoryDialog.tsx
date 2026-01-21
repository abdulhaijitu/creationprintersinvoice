import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Printer, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Bill {
  id: string;
  bill_date: string;
  reference_no: string | null;
  description: string | null;
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

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_no: string | null;
  notes: string | null;
  bill_id?: string | null;
}

interface BillPaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill;
  vendor: Vendor;
  onPrintReceipt: (payment: Payment) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getPaymentMethodLabel = (method: string | null) => {
  const methods: Record<string, string> = {
    cash: "Cash",
    bank: "Bank Transfer",
    bkash: "bKash",
    nagad: "Nagad",
    rocket: "Rocket",
    cheque: "Cheque",
  };
  return methods[method || ""] || method || "Unknown";
};

export const BillPaymentHistoryDialog = ({
  open,
  onOpenChange,
  bill,
  vendor,
  onPrintReceipt,
}: BillPaymentHistoryDialogProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && bill?.id) {
      fetchPayments();
    }
  }, [open, bill?.id]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendor_payments")
        .select("id, payment_date, amount, payment_method, reference_no, notes, bill_id")
        .eq("bill_id", bill.id)
        .order("payment_date", { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error("Error fetching bill payments:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const billNet = bill.net_amount ?? bill.amount;
  const billPaid = bill.paid_amount ?? 0;
  const billDue = Math.max(0, billNet - billPaid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History
          </DialogTitle>
        </DialogHeader>

        {/* Bill Summary */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Vendor</p>
              <p className="font-semibold">{vendor.name}</p>
            </div>
            <Badge
              variant={
                bill.status === "paid"
                  ? "default"
                  : bill.status === "partial"
                  ? "secondary"
                  : "destructive"
              }
              className={bill.status === "paid" ? "bg-success" : ""}
            >
              {bill.status === "paid"
                ? "Paid"
                : bill.status === "partial"
                ? "Partial"
                : "Unpaid"}
            </Badge>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Bill Ref#</p>
              <p className="font-medium">{bill.reference_no || `BILL-${bill.id.slice(0, 8)}`}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Bill Date</p>
              <p className="font-medium">{format(new Date(bill.bill_date), "dd MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Amount</p>
              <p className="font-medium">{formatCurrency(billNet)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining Due</p>
              <p className={`font-bold ${billDue > 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(billDue)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Payment Progress</span>
            <span className="font-medium">
              {formatCurrency(billPaid)} / {formatCurrency(billNet)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${Math.min(100, (billPaid / billNet) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {((billPaid / billNet) * 100).toFixed(1)}% paid
          </p>
        </div>

        {/* Payments Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right w-[80px]">Print</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No payments recorded for this bill</p>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.reference_no || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPrintReceipt(payment)}
                        title="Print Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        {!loading && payments.length > 0 && (
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded
            </p>
            <p className="font-semibold text-success">
              Total Paid: {formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BillPaymentHistoryDialog;
