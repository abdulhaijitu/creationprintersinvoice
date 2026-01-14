import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building2,
  Truck,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import PrintTemplate from '@/components/print/PrintTemplate';
import '@/components/print/printStyles.css';
import { CreateChallanDialog } from '@/components/delivery-challan/CreateChallanDialog';
import { AddPaymentDialog } from '@/components/invoice/AddPaymentDialog';
import { calculateInvoiceStatus } from '@/lib/invoiceUtils';
import { downloadAsPDF } from '@/lib/pdfUtils';

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
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank Transfer',
  bkash: 'bKash',
  nagad: 'Nagad',
  check: 'Check',
  other: 'Other',
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate status from amounts (single source of truth)
  const getInvoiceStatus = () => {
    if (!invoice) return null;
    return calculateInvoiceStatus(invoice.total, invoice.paid_amount, invoice.due_date);
  };

  const statusInfo = invoice ? getInvoiceStatus() : null;

  const getStatusBadge = () => {
    if (!statusInfo) return null;
    const { displayStatus } = statusInfo;

    const badges = {
      paid: (
        <Badge className="bg-success/10 text-success border-0 text-base py-1 px-3">
          <CheckCircle className="w-4 h-4 mr-1" />
          Fully Paid
        </Badge>
      ),
      partial: (
        <Badge className="bg-warning/10 text-warning border-0 text-base py-1 px-3">
          <Clock className="w-4 h-4 mr-1" />
          Partial
        </Badge>
      ),
      overdue: (
        <Badge className="bg-destructive/10 text-destructive border-0 text-base py-1 px-3">
          <AlertCircle className="w-4 h-4 mr-1" />
          Overdue
        </Badge>
      ),
      unpaid: (
        <Badge className="bg-muted text-muted-foreground border-0 text-base py-1 px-3">
          <XCircle className="w-4 h-4 mr-1" />
          Unpaid
        </Badge>
      ),
      due: (
        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-base py-1 px-3">
          <Clock className="w-4 h-4 mr-1" />
          Due
        </Badge>
      ),
    };

    return badges[displayStatus] || badges.unpaid;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    downloadAsPDF('invoice', invoice.invoice_number, () => {
      toast.success('Select "Save as PDF" to save as PDF');
    });
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
        <p className="text-muted-foreground">Invoice not found</p>
        <Button variant="link" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const remaining = statusInfo?.dueAmount || 0;
  const isFullyPaid = statusInfo?.isFullyPaid || false;

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
              <h1 className="text-3xl font-bold">Invoice #{invoice.invoice_number}</h1>
              <p className="text-muted-foreground">
                {format(new Date(invoice.invoice_date), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <CreateChallanDialog 
              preselectedInvoiceId={invoice.id}
              trigger={
                <Button variant="outline" size="sm">
                  <Truck className="h-4 w-4 mr-2" />
                  Create Challan
                </Button>
              }
            />
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            {!isFullyPaid && (
              <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    {companySettings?.logo_url ? (
                      <img 
                        src={companySettings.logo_url} 
                        alt="Company Logo" 
                        className="w-16 h-16 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                        <span className="text-primary-foreground font-bold text-2xl">
                          {(companySettings?.company_name || 'C').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-primary">
                        {companySettings?.company_name || 'Company Name'}
                      </h2>
                      {companySettings?.company_name_bn && (
                        <p className="text-muted-foreground text-sm">{companySettings.company_name_bn}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {companySettings?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {companySettings.phone}
                          </span>
                        )}
                        {companySettings?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {companySettings.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge()}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Bill To</p>
                    <p className="font-semibold text-lg">{invoice.customers?.name}</p>
                    {invoice.customers?.company_name && (
                      <p className="text-sm flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {invoice.customers.company_name}
                      </p>
                    )}
                    {invoice.customers?.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {invoice.customers.phone}
                      </p>
                    )}
                    {invoice.customers?.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {invoice.customers.address}
                      </p>
                    )}
                  </div>
                  <div className="text-right bg-muted/50 p-4 rounded-lg border-r-4 border-success">
                    <div className="space-y-2">
                      <p>
                        <span className="text-muted-foreground text-sm">Invoice No:</span>{' '}
                        <span className="font-bold text-primary text-lg">{invoice.invoice_number}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span>{' '}
                        {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Due:</span>{' '}
                          {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary/10">
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="text-center font-semibold">Qty</TableHead>
                      <TableHead className="text-right font-semibold">Unit Price</TableHead>
                      <TableHead className="text-right font-semibold">Discount</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-info flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-info" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Payments */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-success" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">
                      -{formatCurrency(Number(invoice.discount))}
                    </span>
                  </div>
                )}
                {Number(invoice.tax) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax/VAT</span>
                    <span>{formatCurrency(Number(invoice.tax))}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-primary/20 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(invoice.total))}</span>
                </div>
                
                {/* Paid Amount Section - Conditional styling based on payment status */}
                {isFullyPaid ? (
                  <div className="flex justify-between text-sm bg-success/10 p-3 rounded-lg border border-success/20">
                    <span className="text-success font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Fully Paid
                    </span>
                    <span className="font-bold text-success">{formatCurrency(Number(invoice.paid_amount))}</span>
                  </div>
                ) : Number(invoice.paid_amount) > 0 ? (
                  <div className="flex justify-between text-sm bg-warning/10 p-2 rounded border border-warning/20">
                    <span className="text-warning-foreground">Paid Amount</span>
                    <span className="font-medium text-warning">{formatCurrency(Number(invoice.paid_amount))}</span>
                  </div>
                ) : null}
                
                {remaining > 0 && (
                  <div className="flex justify-between font-bold pt-2 border-t bg-destructive/5 p-2 rounded">
                    <span className="text-destructive">Amount Due</span>
                    <span className="text-destructive">{formatCurrency(remaining)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History - Professional Read-Only Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No payments recorded yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment, index) => (
                      <div key={payment.id}>
                        <div className="p-3 bg-success/5 border border-success/20 rounded-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-success">
                                {formatCurrency(Number(payment.amount))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                            </Badge>
                          </div>
                          
                          {payment.reference && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Ref:</span> {payment.reference}
                            </div>
                          )}
                          
                          {payment.notes && (
                            <div className="text-xs text-muted-foreground italic">
                              {payment.notes}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <User className="h-3 w-3" />
                            <span>
                              Recorded {format(new Date(payment.created_at), 'dd MMM yyyy, HH:mm')}
                            </span>
                          </div>
                        </div>
                        {index < payments.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog
        invoice={{
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total: Number(invoice.total),
          paid_amount: Number(invoice.paid_amount),
          customers: invoice.customers,
        }}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onPaymentAdded={fetchInvoice}
      />
    </>
  );
};

export default InvoiceDetail;
