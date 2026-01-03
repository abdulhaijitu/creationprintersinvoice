import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  CheckCircle,
  Clock,
  XCircle,
  ArrowRightCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import PrintTemplate from '@/components/print/PrintTemplate';
import '@/components/print/printStyles.css';

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  customers: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    company_name: string | null;
  } | null;
}

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
}

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const [quotationRes, itemsRes] = await Promise.all([
        supabase
          .from('quotations')
          .select('*, customers(*)')
          .eq('id', id)
          .single(),
        supabase.from('quotation_items').select('*').eq('quotation_id', id),
      ]);

      if (quotationRes.error) throw quotationRes.error;
      setQuotation(quotationRes.data);
      setItems(itemsRes.data || []);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('কোটেশন লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!quotation) return;
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus as 'pending' | 'accepted' | 'rejected' })
        .eq('id', quotation.id);

      if (error) throw error;

      setQuotation({ ...quotation, status: newStatus });
      toast.success('স্ট্যাটাস আপডেট হয়েছে');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation) return;
    setConverting(true);

    try {
      // Generate invoice number
      const { data: invoiceNumber, error: rpcError } = await supabase.rpc('generate_invoice_number');
      if (rpcError) throw rpcError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_id: quotation.customers?.id,
            invoice_date: format(new Date(), 'yyyy-MM-dd'),
            subtotal: quotation.subtotal,
            discount: quotation.discount,
            tax: quotation.tax,
            total: quotation.total,
            notes: quotation.notes,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from quotation items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update quotation status to accepted
      await supabase
        .from('quotations')
        .update({ status: 'accepted' })
        .eq('id', quotation.id);

      toast.success('ইনভয়েস তৈরি হয়েছে');
      setConvertDialogOpen(false);
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Error converting to invoice:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    } finally {
      setConverting(false);
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
      case 'accepted':
        return (
          <Badge className="bg-success/10 text-success border-0 text-base py-1 px-3">
            <CheckCircle className="w-4 h-4 mr-1" />
            গৃহীত
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning/10 text-warning border-0 text-base py-1 px-3">
            <Clock className="w-4 h-4 mr-1" />
            পেন্ডিং
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 text-base py-1 px-3">
            <XCircle className="w-4 h-4 mr-1" />
            বাতিল
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
    window.print();
    toast.success('PDF হিসেবে সংরক্ষণ করতে "Save as PDF" নির্বাচন করুন');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">কোটেশন পাওয়া যায়নি</p>
        <Button variant="link" onClick={() => navigate('/quotations')}>
          কোটেশন তালিকায় ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print Template - Hidden on screen, visible on print */}
      <div className="print-content">
        <PrintTemplate
          type="quotation"
          documentNumber={quotation.quotation_number}
          date={quotation.quotation_date}
          validUntil={quotation.valid_until}
          customer={quotation.customers}
          items={items}
          subtotal={Number(quotation.subtotal)}
          discount={Number(quotation.discount)}
          tax={Number(quotation.tax)}
          total={Number(quotation.total)}
          notes={quotation.notes}
          status={quotation.status}
        />
      </div>

      {/* Screen Content */}
      <div className="space-y-6 animate-fade-in print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/quotations')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">কোটেশন #{quotation.quotation_number}</h1>
              <p className="text-muted-foreground">
                {format(new Date(quotation.quotation_date), 'd MMMM yyyy', { locale: bn })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              প্রিন্ট
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            {quotation.status === 'pending' && (
              <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <ArrowRightCircle className="h-4 w-4 mr-2" />
                    Invoice এ রূপান্তর
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invoice এ রূপান্তর করুন</DialogTitle>
                    <DialogDescription>
                      এই কোটেশন থেকে একটি নতুন ইনভয়েস তৈরি হবে। কোটেশনের স্ট্যাটাস "গৃহীত" হয়ে যাবে।
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
                      বাতিল
                    </Button>
                    <Button onClick={handleConvertToInvoice} disabled={converting}>
                      {converting ? 'রূপান্তর হচ্ছে...' : 'রূপান্তর করুন'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Header */}
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
                    {getStatusBadge(quotation.status)}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2 font-medium">প্রাপক:</p>
                    <p className="font-semibold text-lg">{quotation.customers?.name}</p>
                    {quotation.customers?.company_name && (
                      <p className="text-sm">{quotation.customers.company_name}</p>
                    )}
                    {quotation.customers?.phone && (
                      <p className="text-sm text-muted-foreground">📞 {quotation.customers.phone}</p>
                    )}
                    {quotation.customers?.address && (
                      <p className="text-sm text-muted-foreground">
                        📍 {quotation.customers.address}
                      </p>
                    )}
                  </div>
                  <div className="text-right bg-muted/50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <p>
                        <span className="text-muted-foreground">কোটেশন নং:</span>{' '}
                        <span className="font-bold text-primary">{quotation.quotation_number}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">তারিখ:</span>{' '}
                        {format(new Date(quotation.quotation_date), 'd MMMM yyyy', { locale: bn })}
                      </p>
                      {quotation.valid_until && (
                        <p>
                          <span className="text-muted-foreground">মেয়াদ:</span>{' '}
                          {format(new Date(quotation.valid_until), 'd MMMM yyyy', { locale: bn })}
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
            {quotation.notes && (
              <Card className="border-info/20 bg-info/5">
                <CardHeader>
                  <CardTitle className="text-sm text-info">নোট / শর্তাবলী</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Status */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>সারাংশ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">সাবটোটাল</span>
                  <span>{formatCurrency(Number(quotation.subtotal))}</span>
                </div>
                {Number(quotation.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ছাড়</span>
                    <span className="text-destructive">
                      -{formatCurrency(Number(quotation.discount))}
                    </span>
                  </div>
                )}
                {Number(quotation.tax) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ট্যাক্স/ভ্যাট</span>
                    <span>{formatCurrency(Number(quotation.tax))}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t font-bold text-lg">
                  <span>মোট</span>
                  <span className="text-primary">{formatCurrency(Number(quotation.total))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle>স্ট্যাটাস পরিবর্তন</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={quotation.status}
                  onValueChange={handleStatusChange}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-warning" />
                        পেন্ডিং
                      </div>
                    </SelectItem>
                    <SelectItem value="accepted">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        গৃহীত
                      </div>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        বাতিল
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuotationDetail;
