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
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import PrintTemplate from '@/components/print/PrintTemplate';
import '@/components/print/printStyles.css';

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
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!invoice || !paymentAmount) return;

    const amount = Number(paymentAmount);
    const remaining = Number(invoice.total) - Number(invoice.paid_amount);

    if (amount <= 0 || amount > remaining) {
      toast.error('Please enter valid amount');
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

      toast.success('Payment added');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      fetchInvoice();
    } catch (error: any) {
      console.error('Error adding payment:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
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
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0 text-base py-1 px-3">
            <Clock className="w-4 h-4 mr-1" />
            Partial
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 text-base py-1 px-3">
            <XCircle className="w-4 h-4 mr-1" />
            Unpaid
          </Badge>
        );
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Open print dialog which can be saved as PDF
    window.print();
    toast.success('Select "Save as PDF" to save as PDF');
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
    <>
      {/* Print Template - Hidden on screen, visible on print */}
      <div className="print-content">
        <PrintTemplate
          type="invoice"
          documentNumber={invoice.invoice_number}
          date={invoice.invoice_date}
          dueDate={invoice.due_date}
          customer={invoice.customers}
          items={items}
          subtotal={Number(invoice.subtotal)}
          discount={Number(invoice.discount)}
          tax={Number(invoice.tax)}
          total={Number(invoice.total)}
          paidAmount={Number(invoice.paid_amount)}
          notes={invoice.notes}
          status={invoice.status}
        />
      </div>

      {/* Screen Content */}
      <div className="space-y-6 animate-fade-in print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">ইনভয়েস #{invoice.invoice_number}</h1>
              <p className="text-muted-foreground">
                {format(new Date(invoice.invoice_date), 'd MMMM yyyy', { locale: bn })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              সম্পাদনা
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              প্রিন্ট
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
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
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                      <span className="text-primary-foreground font-bold text-2xl">C</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary">Creation Printers</h2>
                      <p className="text-muted-foreground">প্রিন্টিং ও প্যাকেজিং সলিউশন</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2 font-medium">বিল করা হয়েছে:</p>
                    <p className="font-semibold text-lg">{invoice.customers?.name}</p>
                    {invoice.customers?.company_name && (
                      <p className="text-sm">{invoice.customers.company_name}</p>
                    )}
                    {invoice.customers?.phone && (
                      <p className="text-sm text-muted-foreground">📞 {invoice.customers.phone}</p>
                    )}
                    {invoice.customers?.address && (
                      <p className="text-sm text-muted-foreground">
                        📍 {invoice.customers.address}
                      </p>
                    )}
                  </div>
                  <div className="text-right bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <p>
                        <span className="text-muted-foreground">ইনভয়েস নং:</span>{' '}
                        <span className="font-bold text-primary">{invoice.invoice_number}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">তারিখ:</span>{' '}
                        {format(new Date(invoice.invoice_date), 'd MMMM yyyy', { locale: bn })}
                      </p>
                      {invoice.due_date && (
                        <p>
                          <span className="text-muted-foreground">ডিউ তারিখ:</span>{' '}
                          {format(new Date(invoice.due_date), 'd MMMM yyyy', { locale: bn })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
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
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(item.unit_price))}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {Number(item.discount) > 0 ? `-${formatCurrency(Number(item.discount))}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
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
              <Card className="border-info/20 bg-info/5">
                <CardHeader>
                  <CardTitle className="text-sm text-info">নোট</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Payments */}
          <div className="space-y-6">
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
                <div className="flex justify-between pt-3 border-t font-bold text-lg">
                  <span>মোট</span>
                  <span className="text-primary">{formatCurrency(Number(invoice.total))}</span>
                </div>
                <div className="flex justify-between text-success">
                  <span>পরিশোধিত</span>
                  <span>{formatCurrency(Number(invoice.paid_amount))}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-destructive font-bold pt-2 border-t">
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
                      className="flex justify-between items-center p-3 bg-success/5 border border-success/20 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-success">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.payment_date), 'd MMM yyyy', { locale: bn })} •{' '}
                          {payment.payment_method}
                        </p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceDetail;
