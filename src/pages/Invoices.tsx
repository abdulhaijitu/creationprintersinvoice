import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Eye, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download, 
  Trash2, 
  Upload,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import CSVImportDialog from '@/components/import/CSVImportDialog';
import { ImportResult } from '@/lib/importUtils';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  customers: { name: string } | null;
}

type StatusFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'overdue';

const Invoices = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
      await supabase.from('invoice_items').delete().eq('invoice_id', id);
      await supabase.from('invoice_payments').delete().eq('invoice_id', id);
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
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid') return false;
    if (!invoice.due_date) return false;
    return isPast(parseISO(invoice.due_date));
  };

  const getDisplayStatus = (invoice: Invoice): 'paid' | 'unpaid' | 'partial' | 'overdue' => {
    if (isOverdue(invoice)) return 'overdue';
    return invoice.status;
  };

  const getStatusBadge = (invoice: Invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    
    switch (displayStatus) {
      case 'paid':
        return (
          <Badge className="bg-success/10 text-success border-0 rounded-full px-3 py-1 font-medium text-xs gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Paid
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0 rounded-full px-3 py-1 font-medium text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Partial
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0 rounded-full px-3 py-1 font-medium text-xs gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 rounded-full px-3 py-1 font-medium text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Unpaid
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return isOverdue(invoice);
    if (statusFilter === 'paid') return invoice.status === 'paid';
    if (statusFilter === 'unpaid') return invoice.status === 'unpaid' && !isOverdue(invoice);
    if (statusFilter === 'partial') return invoice.status === 'partial' && !isOverdue(invoice);

    return true;
  });

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

        let invoiceDate = new Date().toISOString().split('T')[0];
        if (invoiceDateStr) {
          const parts = invoiceDateStr.split('/');
          if (parts.length === 3) {
            invoiceDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

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

  // Stats
  const totalInvoices = invoices.length;
  const paidCount = invoices.filter(i => i.status === 'paid').length;
  const unpaidCount = invoices.filter(i => i.status === 'unpaid').length;
  const overdueCount = invoices.filter(i => isOverdue(i)).length;

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all your invoices in one place
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{totalInvoices}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-success uppercase tracking-wide">Paid</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{paidCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Unpaid</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{unpaidCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{overdueCount}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice no or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 h-10"
              />
            </div>

            {/* Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px] bg-background/50 border-border/50 h-10">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 sm:ml-auto">
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 gap-2 border-border/50" 
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-border/50">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Download Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                size="sm"
                className="h-10 gap-2 shadow-sm" 
                onClick={() => navigate('/invoices/new')}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Invoice</span>
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-border/50">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No invoices found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first invoice to get started'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button 
                    className="mt-4 gap-2" 
                    size="sm"
                    onClick={() => navigate('/invoices/new')}
                  >
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                        Invoice No
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                        Customer
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                        Total
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                        Paid
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap w-[100px]">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice, index) => (
                      <TableRow 
                        key={invoice.id}
                        className={`
                          transition-colors duration-150 cursor-pointer
                          ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}
                          hover:bg-primary/5
                        `}
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <TableCell className="font-semibold text-foreground whitespace-nowrap">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell className="text-foreground whitespace-nowrap">
                          {invoice.customers?.name || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground whitespace-nowrap tabular-nums">
                          {formatCurrency(Number(invoice.total))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatCurrency(Number(invoice.paid_amount))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {getStatusBadge(invoice)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Invoice</TooltipContent>
                            </Tooltip>

                            {isAdmin && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(invoice.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Invoice</TooltipContent>
                              </Tooltip>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleExport('csv')}
                                  className="text-muted-foreground"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(invoice.id)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && filteredInvoices.length > 0 && (
            <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
            </div>
          )}
        </div>

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
    </TooltipProvider>
  );
};

export default Invoices;
