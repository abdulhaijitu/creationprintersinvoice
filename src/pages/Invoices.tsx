import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useActionPermission } from '@/components/guards/ActionGuard';
import { ActionGuard, CreateGuard, EditGuard, DeleteGuard, ManageGuard } from '@/components/guards/ActionGuard';
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
  Send,
  Edit
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import { calculateInvoiceStatus, type InvoiceDisplayStatus } from '@/lib/invoiceUtils';
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

type StatusFilter = 'all' | 'paid' | 'unpaid' | 'partial' | 'overdue';

const Invoices = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organization } = useOrganization();
  
  // Use action permissions for this module
  const invoicePerms = useActionPermission('invoices');
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'delete' | 'markPaid' | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number } | null>(null);

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
    if (organization?.id) {
      fetchInvoices();
    }
  }, [organization?.id]);

  const fetchInvoices = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('organization_id', organization.id)
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
    const total = selectedItems.length;
    let successCount = 0;
    let failedCount = 0;
    
    setDeleteProgress({ current: 0, total });
    
    try {
      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        
        try {
          // Delete related records first
          await supabase.from('invoice_items').delete().eq('invoice_id', item.id);
          await supabase.from('invoice_payments').delete().eq('invoice_id', item.id);
          
          // Delete the invoice
          const { error } = await supabase.from('invoices').delete().eq('id', item.id);
          
          if (error) {
            failedCount++;
            console.error(`Failed to delete invoice ${item.invoice_number}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          failedCount++;
          console.error(`Error deleting invoice ${item.invoice_number}:`, err);
        }
        
        // Update progress after each item
        setDeleteProgress({ current: i + 1, total });
      }
      
      // Show appropriate toast based on results
      if (failedCount === 0) {
        toast.success(`${successCount} invoice${successCount !== 1 ? 's' : ''} deleted successfully`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} invoice(s). ${failedCount} failed.`);
      } else {
        toast.error('Failed to delete invoices. Please try again.');
      }
      
      clearSelection();
      fetchInvoices();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast.error('Failed to delete invoices. Please try again.');
    } finally {
      setDeleteProgress(null);
      setBulkAction(null);
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

  // Use centralized status calculation
  const getInvoiceStatusInfo = (invoice: Invoice) => {
    return calculateInvoiceStatus(invoice.total, invoice.paid_amount, invoice.due_date);
  };

  const getDisplayStatus = (invoice: Invoice): InvoiceDisplayStatus => {
    return getInvoiceStatusInfo(invoice).displayStatus;
  };

  const getStatusBadge = (invoice: Invoice) => {
    const statusInfo = getInvoiceStatusInfo(invoice);
    const { displayStatus, isFullyPaid } = statusInfo;
    
    const badges: Record<InvoiceDisplayStatus, JSX.Element> = {
      paid: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle className="w-3.5 h-3.5" />
          {isFullyPaid ? 'Fully Paid' : 'Paid'}
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
      unpaid: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Unpaid
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
    // Map 'due' to 'unpaid' for filtering purposes
    const normalizedStatus = displayStatus === 'due' ? 'unpaid' : displayStatus;
    return normalizedStatus === statusFilter;
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
    
    const exportData = dataToExport.map(inv => {
      const statusInfo = getInvoiceStatusInfo(inv);
      return {
        invoice_number: inv.invoice_number,
        customer_name: inv.customers?.name || '',
        invoice_date: format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
        total: inv.total,
        paid_amount: inv.paid_amount,
        due_amount: statusInfo.dueAmount,
        status: statusInfo.displayStatus,
      };
    });

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

  // Stats - use centralized status calculation
  const totalInvoices = invoices.length;
  const paidCount = invoices.filter(i => getDisplayStatus(i) === 'paid').length;
  const unpaidCount = invoices.filter(i => {
    const status = getDisplayStatus(i);
    return status === 'unpaid' || status === 'due';
  }).length;
  const overdueCount = invoices.filter(i => getDisplayStatus(i) === 'overdue').length;
  const partialCount = invoices.filter(i => getDisplayStatus(i) === 'partial').length;
  const totalDueAmount = invoices.reduce((sum, inv) => sum + getInvoiceStatusInfo(inv).dueAmount, 0);

  // Bulk actions - only include actions user has permission for
  const bulkActions = [
    // Edit permission needed for mark paid
    ...(invoicePerms.canEdit ? [{
      id: 'mark-paid',
      label: 'Mark Paid',
      icon: CheckCircle,
      onClick: handleBulkMarkPaid,
    }] : []),
    // View permission for send reminder (just viewing contacts)
    {
      id: 'send-reminder',
      label: 'Send Reminder',
      icon: Send,
      onClick: handleBulkSendReminder,
    },
    // Delete permission needed for bulk delete
    ...(invoicePerms.canDelete ? [{
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: () => {
        setBulkAction('delete');
        setDeleteDialogOpen(true);
      },
    }] : []),
  ];

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6 w-full min-w-0 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage and track all your invoices in one place
          </p>
        </div>

        {/* Stats Cards - 2-col tablet, 5-col desktop */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{totalInvoices}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-success uppercase tracking-wide">Paid</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{paidCount}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Unpaid</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{unpaidCount}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">Overdue</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{overdueCount}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50 col-span-2 md:col-span-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Due</p>
            <p className="text-lg md:text-xl font-semibold text-foreground mt-1">{formatCurrency(totalDueAmount)}</p>
          </div>
        </div>

        {/* Controls - responsive grid for tablet */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="p-3 md:p-4 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
            {/* Search */}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice no or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 h-10 w-full"
              />
            </div>

            {/* Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full lg:w-[140px] bg-background/50 border-border/50 h-10">
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

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {/* Import - requires create permission */}
              {invoicePerms.canCreate && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-10 gap-2 border-border/50 flex-1 sm:flex-none" 
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 gap-2 border-border/50 flex-1 sm:flex-none">
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

              {/* New Invoice - requires create permission */}
              {invoicePerms.canCreate && (
                <Button 
                  size="sm"
                  className="h-10 gap-2 shadow-sm flex-1 sm:flex-none" 
                  onClick={() => navigate('/invoices/new')}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Invoice</span>
                  <span className="sm:hidden">New</span>
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-border/50">
            {loading ? (
              <div className="p-4 space-y-3">
                {/* Enhanced skeleton matching invoice table layout */}
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ opacity: 1 - i * 0.1 }}
                  >
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse" style={{ width: '80px' }} />
                    <div className="h-4 bg-muted rounded animate-pulse flex-1" style={{ maxWidth: '120px' }} />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse hidden md:block" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse text-right" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse text-right hidden md:block" />
                    <div className="h-4 w-14 bg-muted rounded animate-pulse text-right" />
                    <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                  </div>
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
              <>
                {/* Desktop/Tablet: Responsive Table - NO scroll */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                            className={isSomeSelected ? 'data-[state=checked]:bg-primary' : ''}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                          Invoice No
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                          Customer
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                          Date
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                          Total
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden xl:table-cell">
                          Paid
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                          Due
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right w-[80px]">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice, index) => {
                          const statusInfo = getInvoiceStatusInfo(invoice);
                          const displayStatus = statusInfo.displayStatus;
                          const dueAmount = statusInfo.dueAmount;
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
                              <TableCell className="font-semibold text-foreground">
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell className="text-foreground truncate max-w-[120px] lg:max-w-[180px]">
                                {invoice.customers?.name || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground hidden lg:table-cell">
                                {format(new Date(invoice.invoice_date), 'dd MMM')}
                              </TableCell>
                              <TableCell className="text-right font-medium text-foreground tabular-nums">
                                {formatCurrency(Number(invoice.total))}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums hidden xl:table-cell">
                                {formatCurrency(Number(invoice.paid_amount))}
                              </TableCell>
                              <TableCell className={`text-right font-medium tabular-nums ${dueAmount > 0 ? 'text-destructive' : 'text-success'}`}>
                                {formatCurrency(dueAmount)}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                                {getStatusBadge(invoice)}
                              </TableCell>
                              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

                                  {/* Delete button - only if user has delete permission */}
                                  {invoicePerms.canDelete && (
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
                                      {invoicePerms.canDelete && (
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

                {/* Mobile: Card layout */}
                <div className="block md:hidden p-3 space-y-3">
                  {filteredInvoices.map((invoice) => {
                    const statusInfo = getInvoiceStatusInfo(invoice);
                    return (
                      <div
                        key={invoice.id}
                        className="bg-card border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{invoice.invoice_number}</span>
                              {getStatusBadge(invoice)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {invoice.customers?.name || 'No Customer'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected(invoice.id)}
                              onCheckedChange={() => toggleItem(invoice.id)}
                              aria-label={`Select ${invoice.invoice_number}`}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-2 border-t">
                          <div>
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-medium">{formatCurrency(Number(invoice.total))}</span>
                          </div>
                          {statusInfo.dueAmount > 0 && (
                            <div>
                              <span className="text-muted-foreground">Due: </span>
                              <span className="font-medium text-destructive">{formatCurrency(statusInfo.dueAmount)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {invoicePerms.canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(invoice.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
          loading={deleteProgress !== null}
          progress={deleteProgress ?? undefined}
        />
      </div>
    </TooltipProvider>
  );
};

export default Invoices;
