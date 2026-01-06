import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { FileText, Download, CreditCard, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import BillingInvoicePDF from '@/components/billing/BillingInvoicePDF';
import type { BillingInvoice } from '@/hooks/useBillingInvoices';

const Billing = () => {
  const { organization, subscription } = useOrganization();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organization) {
      fetchInvoices();
    }
  }, [organization]);

  const fetchInvoices = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices((data || []) as BillingInvoice[]);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (invoice: BillingInvoice) => {
    setSelectedInvoice(invoice);
    setTimeout(() => {
      if (printRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Invoice ${invoice.invoice_number}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>${printRef.current.innerHTML}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    }, 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      unpaid: 'secondary',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid' || i.status === 'overdue');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoices"
        description="View your subscription invoices and payment history"
      />

      {/* Unpaid Invoice Alert */}
      {unpaidInvoices.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unpaid Invoices</AlertTitle>
          <AlertDescription>
            You have {unpaidInvoices.length} unpaid invoice(s). Please make payment to continue using all features.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>Your active plan and subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">{subscription?.plan || 'Free'} Plan</p>
              <p className="text-muted-foreground">
                Status: <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {subscription?.status || 'N/A'}
                </Badge>
              </p>
            </div>
            <Button onClick={() => navigate('/pricing')}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing Invoices
          </CardTitle>
          <CardDescription>View and download your billing invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing invoices yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell className="capitalize">{invoice.plan_name}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.billing_period_start), 'MMM d')} - {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>৳{invoice.total_payable.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden PDF Template */}
      <div className="hidden">
        {selectedInvoice && (
          <BillingInvoicePDF ref={printRef} invoice={selectedInvoice} />
        )}
      </div>
    </div>
  );
};

export default Billing;
