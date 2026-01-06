import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { FileText, Search, Plus, Check, Download, RefreshCw, DollarSign } from 'lucide-react';
import { useBillingInvoices, type BillingInvoice } from '@/hooks/useBillingInvoices';
import MarkPaidDialog from '@/components/billing/MarkPaidDialog';
import GenerateInvoiceDialog from '@/components/billing/GenerateInvoiceDialog';
import BillingInvoicePDF from '@/components/billing/BillingInvoicePDF';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  email: string | null;
  owner_email: string | null;
  subscription?: {
    plan: string;
    status: string;
  };
}

const AdminBillingTable = () => {
  const { invoices, loading, fetchInvoices, generateInvoice, markAsPaid } = useBillingInvoices();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          id, name, email, owner_email,
          subscriptions (plan, status)
        `);
      if (error) throw error;
      setOrganizations(
        (data || []).map(org => ({
          ...org,
          subscription: (org.subscriptions as unknown as Array<{ plan: string; status: string }>)?.[0]
        }))
      );
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleMarkPaid = (invoice: BillingInvoice) => {
    setSelectedInvoice(invoice);
    setMarkPaidDialogOpen(true);
  };

  const handleConfirmPayment = async (paymentMethod: string, paymentReference: string) => {
    if (!selectedInvoice) return;
    await markAsPaid(selectedInvoice.id, paymentMethod, paymentReference);
    setSelectedInvoice(null);
  };

  const handleGenerate = async (
    orgId: string,
    businessName: string,
    ownerEmail: string | null,
    planName: string,
    periodStart: Date,
    periodEnd: Date
  ) => {
    await generateInvoice(orgId, businessName, ownerEmail, planName, periodStart, periodEnd);
    fetchInvoices();
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

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    unpaid: invoices.filter(i => i.status === 'unpaid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_payable, 0),
    pendingRevenue: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total_payable, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.unpaid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{stats.pendingRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Billing Invoices
              </CardTitle>
              <CardDescription>Manage subscription billing for all organizations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchInvoices()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Invoice
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice no, business name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No billing invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.business_name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.owner_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{invoice.plan_name}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(invoice.billing_period_start), 'MMM d')} - {format(new Date(invoice.billing_period_end), 'MMM d')}
                        </TableCell>
                        <TableCell className="font-medium">৳{invoice.total_payable.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkPaid(invoice)}
                                title="Mark as Paid"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(invoice)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <GenerateInvoiceDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        organizations={organizations}
        onGenerate={handleGenerate}
      />

      {selectedInvoice && (
        <MarkPaidDialog
          open={markPaidDialogOpen}
          onOpenChange={setMarkPaidDialogOpen}
          invoiceNumber={selectedInvoice.invoice_number}
          amount={selectedInvoice.total_payable}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Hidden PDF Template */}
      <div className="hidden">
        {selectedInvoice && (
          <BillingInvoicePDF ref={printRef} invoice={selectedInvoice} />
        )}
      </div>
    </div>
  );
};

export default AdminBillingTable;
