import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  Filter,
  Send
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import CSVImportDialog from '@/components/import/CSVImportDialog';
import { ImportResult } from '@/lib/importUtils';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

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

type StatusFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'overdue' | 'due';

const Invoices = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organization } = useOrganization();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'markPaid' | null>(null);

  const {
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggleAll,
    toggleItem,
    isSelected,
    clearSelection,
  } = useBulkSelection(invoices);

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

  const handleBulkDelete = async () => {
    try {
      for (const item of selectedItems) {
        await supabase.from('invoice_items').delete().eq('invoice_id', item.id);
        await supabase.from('invoice_payments').delete().eq('invoice_id', item.id);
        await supabase.from('invoices').delete().eq('id', item.id);
      }
      toast.success(`${selectedCount} invoices deleted`);
      clearSelection();
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete some invoices');
    } finally {
      setBulkAction(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleBulkMarkPaid = async () => {
    try {
      for (const item of selectedItems) {
        const dueAmount = Number(item.total) - Number(item.paid_amount);
        if (dueAmount > 0) {
          // Add payment
          await supabase.from('invoice_payments').insert({
            invoice_id: item.id,
            amount: dueAmount,
            payment_date: new Date().toISOString().split('T')[0],
            organization_id: organization?.id,
          });
          // Update invoice
          await supabase.from('invoices').update({
            paid_amount: item.total,
            status: 'paid',
          }).eq('id', item.id);
        }
      }
      toast.success(`${selectedCount} invoices marked as paid`);
      clearSelection();
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoices as paid:', error);
      toast.error('Failed to update some invoices');
    }
  };

  const handleBulkSendReminder = () => {
    toast.info(`Reminder emails would be sent to ${selectedCount} customers`);
    clearSelection();
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDueAmount = (invoice: Invoice) => {
    return Number(invoice.total) - Number(invoice.paid_amount);
  };

  const isOverdue = (invoice: Invoice) => {
    if (invoice.status === 'paid') return false;
    if (!invoice.due_date) return false;
    return isPast(parseISO(invoice.due_date));
  };

  const getDisplayStatus = (invoice: Invoice): 'paid' | 'unpaid' | 'partial' | 'overdue' | 'due' => {
    const dueAmount = getDueAmount(invoice);
    if (dueAmount <= 0) return 'paid';
    if (isOverdue(invoice)) return 'overdue';
    if (Number(invoice.paid_amount) > 0) return 'partial';
    return 'due';
  };

  const getStatusBadge = (invoice: Invoice) => {
    const displayStatus = getDisplayStatus(invoice);
    
    const badges = {
      paid: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle className="w-3.5 h-3.5" />
          Paid
        </span>
      ),
      partial: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
          <Clock className="w-3.5 h-3.5" />
          Partial
        </span>
      ),
      overdue: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          Overdue
        </span>
      ),
      due: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          Due
        </span>
      ),
    };

    return badges[displayStatus];
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    
    const displayStatus = getDisplayStatus(invoice);
    if (statusFilter === 'due') return displayStatus === 'due';
    return displayStatus === statusFilter;
  });

  const invoiceHeaders = {
    invoice_number: 'Invoice No',
    customer_name: 'Customer',
    invoice_date: 'Date',
    total: 'Total',
    paid_amount: 'Paid',
    due_amount: 'Due',
    status: 'Status',
  };

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const dataToExport = selectedCount > 0 ? selectedItems : filteredInvoices;
    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = dataToExport.map(inv => ({
      invoice_number: inv.invoice_number,
      customer_name: inv.customers?.name || '',
      invoice_date: format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
      total: inv.total,
      paid_amount: inv.paid_amount,
      due_amount: getDueAmount(inv),
      status: getDisplayStatus(inv),
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
    let duplicates = 0;
    const errors: string[] = [];

    // Pre-fetch existing customers for matching
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organization?.id);

    const customerMap = new Map(
      existingCustomers?.map(c => [c.name.toLowerCase(), c.id]) || []
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      onProgress?.(i + 1, data.length);

      try {
        const customerName = (row.customer_name || row['Customer Name'] || row['customer'] || '').trim();
        const invoiceDateStr = (row.invoice_date || row['Invoice Date'] || row['date'] || '').trim();
        const totalStr = (row.total || row['Total Amount'] || row['amount'] || '0').trim();
        const statusStr = (row.status || row['Status'] || 'unpaid').toLowerCase().trim();

        // Validate total amount
        const total = parseFloat(totalStr.replace(/[৳$€£¥,\s]/g, '')) || 0;
        if (total <= 0) {
          failed++;
          errors.push(`Row ${i + 2}: Invalid or zero total amount`);
          continue;
        }

        // Generate invoice number using org-based function
        const { data: invoiceNumber, error: numError } = await supabase.rpc(
          'generate_org_invoice_number',
          { p_org_id: organization?.id }
        );
        if (numError) {
          failed++;
          errors.push(`Row ${i + 2}: Failed to generate invoice number`);
          continue;
        }

        // Parse invoice date
        let invoiceDate = new Date().toISOString().split('T')[0];
        if (invoiceDateStr) {
          // Try DD/MM/YYYY format
          const parts = invoiceDateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (parts) {
            invoiceDate = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(invoiceDateStr)) {
            invoiceDate = invoiceDateStr;
          }
        }

        // Find or create customer
        let customerId: string | null = null;
        if (customerName) {
          const existingId = customerMap.get(customerName.toLowerCase());
          if (existingId) {
            customerId = existingId;
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({ name: customerName, organization_id: organization?.id })
              .select('id')
              .single();

            if (!customerError && newCustomer) {
              customerId = newCustomer.id;
              customerMap.set(customerName.toLowerCase(), newCustomer.id);
            }
          }
        }

        // Validate and normalize status
        const validStatuses = ['unpaid', 'partial', 'paid'];
        const status = validStatuses.includes(statusStr) 
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
          organization_id: organization?.id,
        });

        if (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          success++;
        }
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 2}: Unexpected error`);
      }
    }

    if (success > 0) {
      fetchInvoices();
    }

    return { success, failed, errors, duplicates };
  };

  // Stats
  const totalInvoices = invoices.length;
  const paidCount = invoices.filter(i => getDisplayStatus(i) === 'paid').length;
  const dueCount = invoices.filter(i => getDisplayStatus(i) === 'due').length;
  const overdueCount = invoices.filter(i => getDisplayStatus(i) === 'overdue').length;
  const totalDueAmount = invoices.reduce((sum, inv) => sum + getDueAmount(inv), 0);

  const bulkActions = [
    {
      id: 'mark-paid',
      label: 'Mark Paid',
      icon: CheckCircle,
      onClick: handleBulkMarkPaid,
    },
    {
      id: 'send-reminder',
      label: 'Send Reminder',
      icon: Send,
      onClick: handleBulkSendReminder,
    },
    ...(isAdmin
      ? [
          {
            id: 'delete',
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive' as const,
            onClick: () => {
              setBulkAction('delete');
              setDeleteDialogOpen(true);
            },
          },
        ]
      : []),
  ];

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{totalInvoices}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-success uppercase tracking-wide">Paid</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{paidCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Due</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{dueCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{overdueCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Due</p>
            <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(totalDueAmount)}</p>
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
                <SelectItem value="due">Due</SelectItem>
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
                      <TableHead className="w-[40px] sticky top-0 bg-muted/30">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                          className={isSomeSelected ? 'data-[state=checked]:bg-primary' : ''}
                        />
                      </TableHead>
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
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                        Due
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
                    {filteredInvoices.map((invoice, index) => {
                      const dueAmount = getDueAmount(invoice);
                      const displayStatus = getDisplayStatus(invoice);
                      return (
                        <TableRow 
                          key={invoice.id}
                          className={`
                            transition-colors duration-150 cursor-pointer
                            ${index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}
                            ${displayStatus === 'overdue' ? 'bg-destructive/5' : ''}
                            hover:bg-primary/5
                          `}
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected(invoice.id)}
                              onCheckedChange={() => toggleItem(invoice.id)}
                              aria-label={`Select ${invoice.invoice_number}`}
                            />
                          </TableCell>
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
                          <TableCell className={`text-right font-medium whitespace-nowrap tabular-nums ${dueAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                            {formatCurrency(dueAmount)}
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
                      );
                    })}
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

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          actions={bulkActions}
        />

        {/* Bulk Delete Confirmation */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Selected Invoices"
          description={`Are you sure you want to delete ${selectedCount} invoice(s)? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleBulkDelete}
        />
      </div>
    </TooltipProvider>
  );
};

export default Invoices;
