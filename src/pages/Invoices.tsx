import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, Eye, FileText, CheckCircle, Clock, XCircle, Download, Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import CSVImportDialog from '@/components/import/CSVImportDialog';
import { ImportResult } from '@/lib/importUtils';
interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  total: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  customers: { name: string } | null;
}

const Invoices = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      // Delete invoice items first
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      // Delete invoice payments
      await supabase.from('invoice_payments').delete().eq('invoice_id', id);
      // Delete invoice
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/10 text-success border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0">
            <Clock className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0">
            <XCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const invoiceHeaders = {
    invoice_number: 'Invoice No',
    customer_name: 'Customer',
    invoice_date: 'Date',
    total: 'Total',
    paid_amount: 'Paid',
    status: 'Status',
  };

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    if (filteredInvoices.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = filteredInvoices.map(inv => ({
      invoice_number: inv.invoice_number,
      customer_name: inv.customers?.name || '',
      invoice_date: format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
      total: inv.total,
      paid_amount: inv.paid_amount,
      status: inv.status === 'paid' ? 'Paid' : inv.status === 'partial' ? 'Partial' : 'Unpaid',
    }));

    if (exportFormat === 'csv') {
      exportToCSV(exportData, 'invoices', invoiceHeaders);
    } else {
      exportToExcel(exportData, 'invoices', invoiceHeaders);
    }
    toast.success(`${exportFormat.toUpperCase()} file downloading`);
  };

  const invoiceImportFields = ['invoice_number', 'customer_name', 'invoice_date', 'total', 'status'];
  const invoiceFieldMapping: Record<string, string> = {
    invoice_number: 'Invoice Number',
    customer_name: 'Customer Name',
    invoice_date: 'Invoice Date (DD/MM/YYYY)',
    total: 'Total Amount',
    status: 'Status (unpaid/partial/paid)',
  };

  const handleImport = async (
    data: Record<string, string>[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      onProgress?.(i + 1, data.length);

      try {
        const invoiceNumber = row.invoice_number || row['Invoice Number'] || '';
        const customerName = row.customer_name || row['Customer Name'] || '';
        const invoiceDateStr = row.invoice_date || row['Invoice Date'] || '';
        const totalStr = row.total || row['Total Amount'] || '0';
        const statusStr = (row.status || row['Status'] || 'unpaid').toLowerCase();

        if (!invoiceNumber) {
          failed++;
          errors.push(`Row ${i + 1}: Invoice number not provided`);
          continue;
        }

        // Parse date (DD/MM/YYYY format)
        let invoiceDate = new Date().toISOString().split('T')[0];
        if (invoiceDateStr) {
          const parts = invoiceDateStr.split('/');
          if (parts.length === 3) {
            invoiceDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        // Find or create customer
        let customerId: string | null = null;
        if (customerName) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .ilike('name', customerName)
            .limit(1)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({ name: customerName })
              .select('id')
              .single();

            if (!customerError && newCustomer) {
              customerId = newCustomer.id;
            }
          }
        }

        const total = parseFloat(totalStr) || 0;
        const status = ['unpaid', 'partial', 'paid'].includes(statusStr) 
          ? statusStr as 'unpaid' | 'partial' | 'paid' 
          : 'unpaid';
        const paidAmount = status === 'paid' ? total : status === 'partial' ? total / 2 : 0;

        const { error } = await supabase.from('invoices').insert({
          invoice_number: invoiceNumber,
          customer_id: customerId,
          invoice_date: invoiceDate,
          total: total,
          subtotal: total,
          paid_amount: paidAmount,
          status: status,
        });

        if (error) {
          failed++;
          errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 1}: Unexpected error`);
      }
    }

    if (success > 0) {
      fetchInvoices();
    }

    return { success, failed, errors };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage all invoices</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Download Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className="gap-2" onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Invoice No</TableHead>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Paid</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{invoice.customers?.name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(Number(invoice.total))}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(Number(invoice.paid_amount))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CSVImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Invoices"
        description="Upload a CSV file to import invoices. The system will automatically find or create customers."
        requiredFields={invoiceImportFields}
        fieldMapping={invoiceFieldMapping}
        onImport={handleImport}
        templateFilename="invoices"
      />
    </div>
  );
};

export default Invoices;
