import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Building2, 
  Download, 
  Upload, 
  Eye,
  MoreHorizontal,
  Users,
  ChevronDown,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import CSVImportDialog from '@/components/import/CSVImportDialog';
import { ImportResult } from '@/lib/importUtils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BulkActionsBar } from '@/components/shared/BulkActionsBar';
import { canRolePerform, OrgRole } from '@/lib/permissions/constants';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  notes: string | null;
  default_notes: string | null;
  default_terms: string | null;
  created_at: string;
  total_invoiced?: number;
  total_paid?: number;
  total_due?: number;
}

const Customers = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organization, orgRole } = useOrganization();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    company_name: '',
    notes: '',
    default_notes: '',
    default_terms: '',
  });
  const [showDefaultTerms, setShowDefaultTerms] = useState(false);

  // Permission checks
  const canBulkDelete = isAdmin || canRolePerform(orgRole as OrgRole, 'customers', 'delete');
  const canBulkExport = isAdmin || canRolePerform(orgRole as OrgRole, 'customers', 'export');

  // Bulk selection
  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    toggleAll,
    toggleItem,
    isSelected,
    clearSelection,
    selectedItems,
  } = useBulkSelection(customers);

  useEffect(() => {
    if (organization?.id) {
      fetchCustomers();
    }
  }, [organization?.id]);

  const fetchCustomers = async () => {
    if (!organization?.id) return;
    
    try {
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_deleted', false) // Exclude soft-deleted customers
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('customer_id, total, paid_amount')
        .eq('organization_id', organization.id);

      const customerWithLedger = (customersData || []).map(customer => {
        const customerInvoices = invoicesData?.filter(inv => inv.customer_id === customer.id) || [];
        const total_invoiced = customerInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
        const total_paid = customerInvoices.reduce((sum, inv) => sum + (Number(inv.paid_amount) || 0), 0);
        const total_due = total_invoiced - total_paid;

        return {
          ...customer,
          total_invoiced,
          total_paid,
          total_due,
        };
      });

      setCustomers(customerWithLedger);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customer list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Customer updated successfully');
      } else {
        const { error } = await supabase.from('customers').insert([{
          ...formData,
          organization_id: organization?.id,
        }]);

        if (error) throw error;
        toast.success('New customer added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast.error(error.message || 'An error occurred');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      company_name: customer.company_name || '',
      notes: customer.notes || '',
      default_notes: customer.default_notes || '',
      default_terms: customer.default_terms || '',
    });
    setShowDefaultTerms(!!(customer.default_notes || customer.default_terms));
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', deleteId);

      if (error) throw error;
      toast.success('Customer deleted');
      setDeleteId(null);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      
      // Call edge function for safe bulk deletion
      const { data, error } = await supabase.functions.invoke('bulk-delete-customers', {
        body: { customerIds: idsToDelete },
      });

      if (error) throw error;
      
      const { summary } = data;
      
      // Build success message
      const messages: string[] = [];
      if (summary.archived > 0) {
        messages.push(`${summary.archived} customer(s) archived (have linked invoices/challans)`);
      }
      if (summary.deleted > 0) {
        messages.push(`${summary.deleted} customer(s) permanently deleted`);
      }
      if (summary.failed > 0) {
        messages.push(`${summary.failed} failed`);
      }
      
      if (summary.archived > 0 || summary.deleted > 0) {
        toast.success(messages.join(', '));
      } else if (summary.failed > 0) {
        toast.error('Failed to delete customers');
      }
      
      clearSelection();
      setBulkDeleteOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error bulk deleting:', error);
      toast.error(error.message || 'Failed to delete customers');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkExport = (format: 'csv' | 'excel') => {
    if (selectedCount === 0) {
      toast.error('No customers selected');
      return;
    }
    
    const exportData = selectedItems.map(c => ({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      company_name: c.company_name || '',
      address: c.address || '',
      notes: c.notes || '',
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'customers-selected', customerHeaders);
    } else {
      exportToExcel(exportData, 'customers-selected', customerHeaders);
    }
    toast.success(`Exported ${selectedCount} customer(s)`);
    clearSelection();
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      company_name: '',
      notes: '',
      default_notes: '',
      default_terms: '',
    });
    setShowDefaultTerms(false);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery) ||
      customer.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const customerHeaders = {
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    company_name: 'Company',
    address: 'Address',
    notes: 'Notes',
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (filteredCustomers.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = filteredCustomers.map(c => ({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      company_name: c.company_name || '',
      address: c.address || '',
      notes: c.notes || '',
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'customers', customerHeaders);
    } else {
      exportToExcel(exportData, 'customers', customerHeaders);
    }
    toast.success(`${format.toUpperCase()} file downloading`);
  };

  const handleImport = async (
    data: Record<string, string>[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> => {
    let success = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    // Pre-fetch existing customers for duplicate detection
    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('email, phone')
      .eq('organization_id', organization?.id);

    const existingEmails = new Set(
      existingCustomers?.filter(c => c.email).map(c => c.email!.toLowerCase()) || []
    );
    const existingPhones = new Set(
      existingCustomers?.filter(c => c.phone).map(c => c.phone!.replace(/\D/g, '')) || []
    );

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      onProgress?.(i + 1, data.length);
      
      try {
        const name = (row.name || row['Name'] || '').trim();
        const phone = (row.phone || row['Phone'] || '').trim();
        const email = (row.email || row['Email'] || '').trim().toLowerCase();
        const companyName = (row.company_name || row['Company'] || row['company'] || '').trim();
        const address = (row.address || row['Address'] || '').trim();
        const notes = (row.notes || row['Notes'] || '').trim();

        // Validate required field
        if (!name) {
          failed++;
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        // Check for duplicates (email or phone)
        if (email && existingEmails.has(email)) {
          duplicates++;
          errors.push(`Row ${i + 2}: Email "${email}" already exists`);
          continue;
        }
        
        const normalizedPhone = phone.replace(/\D/g, '');
        if (normalizedPhone && existingPhones.has(normalizedPhone)) {
          duplicates++;
          errors.push(`Row ${i + 2}: Phone "${phone}" already exists`);
          continue;
        }

        const customerData = {
          name,
          phone: phone || null,
          email: email || null,
          company_name: companyName || null,
          address: address || null,
          notes: notes || null,
          organization_id: organization?.id,
        };

        const { error } = await supabase.from('customers').insert([customerData]);
        
        if (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          success++;
          // Add to existing sets to prevent duplicates within batch
          if (email) existingEmails.add(email);
          if (normalizedPhone) existingPhones.add(normalizedPhone);
        }
      } catch (err: unknown) {
        failed++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${errorMessage}`);
      }
    }

    if (success > 0) {
      fetchCustomers();
    }

    return { success, failed, errors, duplicates };
  };

  // Stats
  const totalCustomers = customers.length;
  const totalInvoiced = customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6 w-full min-w-0 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Customer List</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage all customer information and view their ledger
          </p>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Customers</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{totalCustomers}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-success uppercase tracking-wide">Total Paid</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-card rounded-xl p-3 md:p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">Total Due</p>
            <p className="text-xl md:text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalDue)}</p>
          </div>
        </div>

        {/* Controls - responsive grid for tablet */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="p-3 md:p-4 grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto]">
            {/* Search */}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 h-10 w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                variant="outline" 
                size="sm" 
                className="h-10 gap-2 border-border/50" 
                onClick={() => setIsImportOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="h-10 gap-2 shadow-sm" 
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New Customer</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                    </DialogTitle>
                    <DialogDescription>
                      Fill in customer information
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Customer name"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full address"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Additional information"
                          rows={2}
                        />
                      </div>
                      
                      {/* Default Notes & Terms Section */}
                      <Collapsible open={showDefaultTerms} onOpenChange={setShowDefaultTerms}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="w-full justify-between text-muted-foreground hover:text-foreground"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Default Notes & Terms (Optional)
                            </span>
                            <ChevronDown className={cn(
                              "h-4 w-4 transition-transform",
                              showDefaultTerms && "rotate-180"
                            )} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                          <p className="text-xs text-muted-foreground">
                            These defaults will auto-fill when creating quotations/invoices for this customer.
                          </p>
                          <div className="space-y-2">
                            <Label>Default Notes</Label>
                            <RichTextEditor
                              value={formData.default_notes}
                              onChange={(val) => setFormData({ ...formData, default_notes: val })}
                              placeholder="Default notes for quotations/invoices..."
                              minHeight="80px"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Default Terms & Conditions</Label>
                            <RichTextEditor
                              value={formData.default_terms}
                              onChange={(val) => setFormData({ ...formData, default_terms: val })}
                              placeholder="Default terms & conditions..."
                              minHeight="80px"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingCustomer ? 'Update' : 'Save'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Table */}
          <div className="border-t border-border/50">
            {loading ? (
              <div className="p-4 space-y-3">
                {/* Enhanced skeleton matching table layout */}
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-lg"
                    style={{ opacity: 1 - i * 0.1 }}
                  >
                    <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${120 + (i * 20) % 80}px` }} />
                        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse hidden md:block" />
                    <div className="h-4 w-20 bg-muted rounded animate-pulse hidden lg:block" />
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No customers found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : 'Add your first customer to get started'}
                </p>
                {!searchQuery && (
                  <Button 
                    className="mt-4 gap-2" 
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Customer
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border/50">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={cn(
                        "p-4 hover:bg-muted/30 transition-colors duration-150 cursor-pointer",
                        isSelected(customer.id) && "bg-primary/10"
                      )}
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        {(canBulkDelete || canBulkExport) && (
                          <div onClick={(e) => e.stopPropagation()} className="pt-1">
                            <Checkbox
                              checked={isSelected(customer.id)}
                              onCheckedChange={() => toggleItem(customer.id)}
                              aria-label={`Select ${customer.name}`}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{customer.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {customer.company_name || '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            'text-sm font-medium tabular-nums',
                            (customer.total_due || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                          )}>
                            {formatCurrency(customer.total_due || 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">due</p>
                        </div>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(customer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View - NO scroll */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {(canBulkDelete || canBulkExport) && (
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={toggleAll}
                              aria-label="Select all"
                              className={isSomeSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                            />
                          </TableHead>
                        )}
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                          Contact
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden xl:table-cell">
                          Company
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden lg:table-cell">
                          Invoiced
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right hidden xl:table-cell">
                          Paid
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                          Due
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right w-[100px]">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer, index) => (
                        <TableRow 
                          key={customer.id}
                          className={cn(
                            'transition-colors duration-150 cursor-pointer',
                            index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                            'hover:bg-primary/5',
                            isSelected(customer.id) && 'bg-primary/10'
                          )}
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          {(canBulkDelete || canBulkExport) && (
                            <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected(customer.id)}
                                onCheckedChange={() => toggleItem(customer.id)}
                                aria-label={`Select ${customer.name}`}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="font-semibold text-foreground truncate max-w-[120px] block">{customer.name}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-0.5">
                              {customer.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {customer.phone}
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[140px]">{customer.email}</span>
                                </div>
                              )}
                              {!customer.phone && !customer.email && (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden xl:table-cell truncate max-w-[100px]">
                            {customer.company_name || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground tabular-nums hidden lg:table-cell">
                            {formatCurrency(customer.total_invoiced || 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums hidden xl:table-cell">
                            <span className="text-success font-medium">
                              {formatCurrency(customer.total_paid || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className={cn(
                              'font-medium',
                              (customer.total_due || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                              {formatCurrency(customer.total_due || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => navigate(`/customers/${customer.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleEdit(customer)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Customer</TooltipContent>
                              </Tooltip>

                              {isAdmin && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteId(customer.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete Customer</TooltipContent>
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
                                  <DropdownMenuItem onClick={() => navigate(`/customers/${customer.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => setDeleteId(customer.id)}
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
              </>
            )}
          </div>

          {/* Footer */}
          {!loading && filteredCustomers.length > 0 && (
            <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {filteredCustomers.length} of {customers.length} customers
              </p>
            </div>
          )}
        </div>

        <CSVImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Customers"
          description="Import customer list from CSV file"
          requiredFields={['name']}
          fieldMapping={customerHeaders}
          onImport={handleImport}
          templateFilename="customers"
        />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Delete Customer"
          description="Are you sure you want to delete this customer? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />

        <ConfirmDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title="Delete Selected Customers"
          description={`Are you sure you want to delete ${selectedCount} customer(s)? This action cannot be undone.`}
          confirmLabel="Delete All"
          variant="destructive"
          onConfirm={handleBulkDelete}
          loading={bulkDeleting}
        />

        {/* Bulk Actions Bar */}
        {(canBulkDelete || canBulkExport) && (
          <BulkActionsBar
            selectedCount={selectedCount}
            onClearSelection={clearSelection}
            actions={[
              ...(canBulkExport ? [{
                id: 'export-csv',
                label: 'Export CSV',
                icon: Download,
                onClick: () => handleBulkExport('csv'),
              },
              {
                id: 'export-excel',
                label: 'Export Excel',
                icon: Download,
                onClick: () => handleBulkExport('excel'),
              }] : []),
              ...(canBulkDelete ? [{
                id: 'delete',
                label: 'Delete',
                icon: Trash2,
                variant: 'destructive' as const,
                onClick: () => setBulkDeleteOpen(true),
              }] : []),
            ]}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default Customers;
