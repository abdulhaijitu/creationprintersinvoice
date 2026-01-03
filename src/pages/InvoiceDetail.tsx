import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  status: string;
  notes: string | null;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    company_name: string | null;
  } | null;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  notes: string | null;
}

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const [invoiceRes, itemsRes, paymentsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, customers(*)')
          .eq('id', id)
          .single(),
        supabase.from('invoice_items').select('*').eq('invoice_id', id),
        supabase
          .from('invoice_payments')
          .select('*')
          .eq('invoice_id', id)
          .order('payment_date', { ascending: false }),
      ]);

      if (invoiceRes.error) throw invoiceRes.error;
      setInvoice(invoiceRes.data);
      setItems(itemsRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error('ইনভয়েস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!invoice || !paymentAmount) return;

    const amount = Number(paymentAmount);
    const remaining = Number(invoice.total) - Number(invoice.paid_amount);

    if (amount <= 0 || amount > remaining) {
      toast.error('সঠিক পরিমাণ দিন');
      return;
    }

    try {
      // Add payment
      const { error: paymentError } = await supabase.from('invoice_payments').insert([
        {
          invoice_id: invoice.id,
          amount,
          payment_method: paymentMethod,
          payment_date: format(new Date(), 'yyyy-MM-dd'),
          created_by: user?.id,
        },
      ]);

      if (paymentError) throw paymentError;

      // Update invoice
      const newPaidAmount = Number(invoice.paid_amount) + amount;
      const newStatus =
        newPaidAmount >= Number(invoice.total) ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      toast.success('পেমেন্ট যোগ হয়েছে');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/10 text-success border-0 text-base py-1 px-3">
            <CheckCircle className="w-4 h-4 mr-1" />
            পরিশোধিত
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0 text-base py-1 px-3">
            <Clock className="w-4 h-4 mr-1" />
            আংশিক
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 text-base py-1 px-3">
            <XCircle className="w-4 h-4 mr-1" />
            বাকি
          </Badge>
        );
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">ইনভয়েস পাওয়া যায়নি</p>
        <Button variant="link" onClick={() => navigate('/invoices')}>
          ইনভয়েস তালিকায় ফিরে যান
        </Button>
      </div>
    );
  }

  const remaining = Number(invoice.total) - Number(invoice.paid_amount);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">ইনভয়েস #{invoice.invoice_number}</h1>
            <p className="text-muted-foreground">
              {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            প্রিন্ট
          </Button>
          {invoice.status !== 'paid' && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CreditCard className="h-4 w-4 mr-2" />
                  পেমেন্ট গ্রহণ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>পেমেন্ট গ্রহণ করুন</DialogTitle>
                  <DialogDescription>
                    বাকি: {formatCurrency(remaining)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>পরিমাণ</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="পরিমাণ লিখুন"
                      max={remaining}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>পেমেন্ট মেথড</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">ক্যাশ</SelectItem>
                        <SelectItem value="bank">ব্যাংক ট্রান্সফার</SelectItem>
                        <SelectItem value="bkash">বিকাশ</SelectItem>
                        <SelectItem value="nagad">নগদ</SelectItem>
                        <SelectItem value="check">চেক</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button onClick={handleAddPayment}>পেমেন্ট সংরক্ষণ</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary">Creation Printers</h2>
                  <p className="text-muted-foreground">প্রিন্টিং ও প্যাকেজিং সলিউশন</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(invoice.status)}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">বিল করা হয়েছে:</p>
                  <p className="font-semibold">{invoice.customers?.name}</p>
                  {invoice.customers?.company_name && (
                    <p className="text-sm">{invoice.customers.company_name}</p>
                  )}
                  {invoice.customers?.phone && (
                    <p className="text-sm">{invoice.customers.phone}</p>
                  )}
                  {invoice.customers?.address && (
                    <p className="text-sm text-muted-foreground">
                      {invoice.customers.address}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <p>
                      <span className="text-muted-foreground">ইনভয়েস নং:</span>{' '}
                      <span className="font-medium">{invoice.invoice_number}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">তারিখ:</span>{' '}
                      {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                    </p>
                    {invoice.due_date && (
                      <p>
                        <span className="text-muted-foreground">ডিউ তারিখ:</span>{' '}
                        {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="print:shadow-none print:border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>বিবরণ</TableHead>
                    <TableHead className="text-center">পরিমাণ</TableHead>
                    <TableHead className="text-right">দাম</TableHead>
                    <TableHead className="text-right">ছাড়</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.unit_price))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.discount))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(item.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card className="print:shadow-none print:border-0">
              <CardHeader>
                <CardTitle className="text-sm">নোট</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary & Payments */}
        <div className="space-y-6 print:hidden">
          <Card>
            <CardHeader>
              <CardTitle>সারাংশ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ছাড়</span>
                  <span className="text-destructive">
                    -{formatCurrency(Number(invoice.discount))}
                  </span>
                </div>
              )}
              {Number(invoice.tax) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ট্যাক্স/ভ্যাট</span>
                  <span>{formatCurrency(Number(invoice.tax))}</span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t font-bold">
                <span>মোট</span>
                <span>{formatCurrency(Number(invoice.total))}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>পরিশোধিত</span>
                <span>{formatCurrency(Number(invoice.paid_amount))}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-destructive font-bold">
                  <span>বাকি</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>পেমেন্ট হিস্ট্রি</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {formatCurrency(Number(payment.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy')} •{' '}
                        {payment.payment_method}
                      </p>
                    </div>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
