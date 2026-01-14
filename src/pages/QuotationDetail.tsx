import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  ArrowRightCircle,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileCheck,
  Loader2,
  Send,
  Eye,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { QuotationPDFTemplate, QuotationPDFData } from '@/components/print/QuotationPDFTemplate';
import '@/components/print/printStyles.css';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { downloadAsPDF } from '@/lib/pdfUtils';

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  notes: string | null;
  converted_to_invoice_id: string | null;
  organization_id: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  converted_by: string | null;
  converted_at: string | null;
  converted_invoice_id: string | null;
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
  unit: string | null;
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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  // Fetch converted by user info if quotation is converted
  const { data: convertedByUser } = useQuery({
    queryKey: ['converted-by-user', quotation?.converted_by],
    queryFn: async () => {
      if (!quotation?.converted_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', quotation.converted_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!quotation?.converted_by,
  });

  // Fetch linked invoice number if converted
  const { data: linkedInvoice } = useQuery({
    queryKey: ['linked-invoice', quotation?.converted_invoice_id || quotation?.converted_to_invoice_id],
    queryFn: async () => {
      const invoiceId = quotation?.converted_invoice_id || quotation?.converted_to_invoice_id;
      if (!invoiceId) return null;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('id', invoiceId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!(quotation?.converted_invoice_id || quotation?.converted_to_invoice_id),
  });

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
      setQuotation(quotationRes.data as Quotation);
      setItems(itemsRes.data || []);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error('Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus: QuotationStatus) => {
    if (!quotation || !user) return;
    setUpdatingStatus(true);

    try {
      const { data, error } = await supabase.rpc('update_quotation_status', {
        p_quotation_id: quotation.id,
        p_new_status: newStatus,
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        toast.error(result?.message || 'Status transition failed');
        return;
      }

      setQuotation({ ...quotation, status: newStatus, status_changed_at: new Date().toISOString(), status_changed_by: user.id });
      toast.success('Status updated');
      setSendDialogOpen(false);
      setAcceptDialogOpen(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation || !user) return;
    
    // Check if already converted
    if (quotation.converted_to_invoice_id) {
      toast.error('This quotation has already been converted to an invoice');
      return;
    }

    // Check if status is accepted
    if (quotation.status !== 'accepted') {
      toast.error('Only accepted quotations can be converted to invoices');
      return;
    }
    
    setConverting(true);

    try {
      // Get organization ID
      const orgId = quotation.organization_id;
      if (!orgId) throw new Error('Organization not found');

      // Generate invoice number using org-specific function
      const { data: seqData, error: rpcError } = await supabase.rpc('generate_org_invoice_number_v2', {
        p_org_id: orgId
      });
      if (rpcError) throw rpcError;
      if (!seqData || seqData.length === 0) throw new Error('Failed to generate invoice number');

      const invoiceNumber = seqData[0].invoice_number;

      // Create invoice with source_quotation_id
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
            organization_id: orgId,
            source_quotation_id: quotation.id,
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
        organization_id: orgId,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update quotation status to converted and link the invoice with audit info
      const { error: statusError } = await supabase.rpc('update_quotation_status', {
        p_quotation_id: quotation.id,
        p_new_status: 'converted',
        p_user_id: user.id,
      });

      if (statusError) throw statusError;

      // Update the quotation with conversion audit fields
      const { error: auditError } = await supabase
        .from('quotations')
        .update({ 
          converted_to_invoice_id: invoice.id,
          converted_invoice_id: invoice.id,
          converted_by: user.id,
          converted_at: new Date().toISOString(),
        })
        .eq('id', quotation.id);

      if (auditError) throw auditError;

      toast.success('Invoice created from quotation');
      setConvertDialogOpen(false);
      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error('Error converting to invoice:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setConverting(false);
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

  // Determine if quotation is editable (only draft status)
  const isEditable = quotation?.status === 'draft';
  const isDeletable = quotation?.status === 'draft';
  const canBeSent = quotation?.status === 'draft';
  const canBeAccepted = quotation?.status === 'sent';
  const canBeConverted = quotation?.status === 'accepted' && !quotation?.converted_to_invoice_id;
  const isConverted = quotation?.status === 'converted' || !!quotation?.converted_to_invoice_id;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!quotation) return;
    downloadAsPDF('quotation', quotation.quotation_number, () => {
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

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Quotation not found</p>
        <Button variant="link" onClick={() => navigate('/quotations')}>
          Back to Quotations
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Print Template - Hidden on screen, visible on print */}
      <div className="print-content">
        <QuotationPDFTemplate
          data={{
            company: {
              name: companySettings?.company_name || 'Company Name',
              nameBn: companySettings?.company_name_bn || undefined,
              address: companySettings?.address || undefined,
              phone: companySettings?.phone || undefined,
              email: companySettings?.email || undefined,
              website: companySettings?.website || undefined,
              logoUrl: companySettings?.logo_url || undefined,
            },
            quotation: {
              number: quotation.quotation_number,
              date: quotation.quotation_date,
              validUntil: quotation.valid_until || undefined,
              status: quotation.status,
            },
            customer: {
              name: quotation.customers?.name || 'N/A',
              companyName: quotation.customers?.company_name || undefined,
              address: quotation.customers?.address || undefined,
              phone: quotation.customers?.phone || undefined,
              email: quotation.customers?.email || undefined,
            },
            items: items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit || undefined,
              unitPrice: Number(item.unit_price),
              discount: item.discount ? Number(item.discount) : undefined,
              total: Number(item.total),
            })),
            totals: {
              subtotal: Number(quotation.subtotal),
              discount: quotation.discount ? Number(quotation.discount) : undefined,
              tax: quotation.tax ? Number(quotation.tax) : undefined,
              total: Number(quotation.total),
            },
            notes: quotation.notes || undefined,
            footer: companySettings?.invoice_footer || 'Thank you for your interest!',
          }}
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
              <h1 className="text-3xl font-bold">Quotation #{quotation.quotation_number}</h1>
              <p className="text-muted-foreground">
                {format(new Date(quotation.quotation_date), 'dd MMMM yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit button - only for draft */}
            {isEditable && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>

            {/* Context-aware primary action */}
            {canBeSent && (
              <Button size="sm" onClick={() => setSendDialogOpen(true)} disabled={updatingStatus}>
                <Send className="h-4 w-4 mr-2" />
                Send Quotation
              </Button>
            )}
            
            {canBeAccepted && (
              <Button size="sm" onClick={() => setAcceptDialogOpen(true)} disabled={updatingStatus}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Accepted
              </Button>
            )}

            {canBeConverted && (
              <Button size="sm" onClick={() => setConvertDialogOpen(true)}>
                <ArrowRightCircle className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
            )}

            {isConverted && quotation.converted_to_invoice_id && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate(`/invoices/${quotation.converted_to_invoice_id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Header */}
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
                    <StatusBadge status={quotation.status} className="text-base py-1 px-3" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                    <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Quotation For</p>
                    <p className="font-semibold text-lg">{quotation.customers?.name}</p>
                    {quotation.customers?.company_name && (
                      <p className="text-sm flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {quotation.customers.company_name}
                      </p>
                    )}
                    {quotation.customers?.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {quotation.customers.phone}
                      </p>
                    )}
                    {quotation.customers?.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {quotation.customers.address}
                      </p>
                    )}
                  </div>
                  <div className="text-right bg-muted/50 p-4 rounded-lg border-r-4 border-warning">
                    <div className="space-y-2">
                      <p>
                        <span className="text-muted-foreground text-sm">Quotation No:</span>{' '}
                        <span className="font-bold text-primary text-lg">{quotation.quotation_number}</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span>{' '}
                        {format(new Date(quotation.quotation_date), 'dd MMM yyyy')}
                      </p>
                      {quotation.valid_until && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Valid Until:</span>{' '}
                          {format(new Date(quotation.valid_until), 'dd MMM yyyy')}
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
            {quotation.notes && (
              <Card className="border-info/20 bg-info/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-info flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-info" />
                    Notes & Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary & Status */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-warning" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(Number(quotation.subtotal))}</span>
                </div>
                {Number(quotation.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">
                      -{formatCurrency(Number(quotation.discount))}
                    </span>
                  </div>
                )}
                {Number(quotation.tax) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax/VAT</span>
                    <span>{formatCurrency(Number(quotation.tax))}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t-2 border-primary/20 font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(Number(quotation.total))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quotation Status Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Current Status</span>
                  <StatusBadge status={quotation.status} />
                </div>
                {quotation.status_changed_at && (
                  <p className="text-xs text-muted-foreground">
                    Last updated on {format(new Date(quotation.status_changed_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                )}
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Status Workflow</p>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={`px-2 py-1 rounded ${quotation.status === 'draft' ? 'bg-muted font-medium' : 'text-muted-foreground'}`}>Draft</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded ${quotation.status === 'sent' ? 'bg-info/10 text-info font-medium' : 'text-muted-foreground'}`}>Sent</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded ${quotation.status === 'accepted' ? 'bg-success/10 text-success font-medium' : 'text-muted-foreground'}`}>Accepted</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded ${quotation.status === 'converted' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>Converted</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Info - Only show when converted */}
            {quotation.status === 'converted' && (quotation.converted_by || quotation.converted_at || linkedInvoice) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Conversion Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {convertedByUser?.full_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Converted by:</span>
                      <span className="font-medium">{convertedByUser.full_name}</span>
                    </div>
                  )}
                  {quotation.converted_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Converted on:</span>
                      <span className="font-medium">
                        {format(new Date(quotation.converted_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                  )}
                  {linkedInvoice && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Invoice No:</span>
                      <Link 
                        to={`/invoices/${linkedInvoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {linkedInvoice.invoice_number}
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Send Quotation Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quotation</DialogTitle>
            <DialogDescription>
              This will mark the quotation as sent and lock editing. The quotation content cannot be modified after this action.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p><strong>Quotation:</strong> {quotation.quotation_number}</p>
              <p><strong>Customer:</strong> {quotation.customers?.name || 'N/A'}</p>
              <p><strong>Total:</strong> {formatCurrency(Number(quotation.total))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusTransition('sent')} disabled={updatingStatus}>
              {updatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quotation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Quotation Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Accepted</DialogTitle>
            <DialogDescription>
              Confirm that the customer has accepted this quotation. Once accepted, you can convert it to an invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p><strong>Quotation:</strong> {quotation.quotation_number}</p>
              <p><strong>Customer:</strong> {quotation.customers?.name || 'N/A'}</p>
              <p><strong>Total:</strong> {formatCurrency(Number(quotation.total))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStatusTransition('accepted')} disabled={updatingStatus}>
              {updatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Accepted
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription>
              This will create a new invoice from this quotation. All line items, customer details, and totals will be copied. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p><strong>Customer:</strong> {quotation.customers?.name || 'N/A'}</p>
              <p><strong>Items:</strong> {items.length} line item{items.length !== 1 ? 's' : ''}</p>
              <p><strong>Total:</strong> {formatCurrency(Number(quotation.total))}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConvertToInvoice} disabled={converting}>
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Convert to Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuotationDetail;