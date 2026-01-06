import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';
import CSVImportDialog from '@/components/import/CSVImportDialog';
import { ImportResult } from '@/lib/importUtils';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
  total_invoiced?: number;
  total_paid?: number;
  total_due?: number;
}

const Customers = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organization } = useOrganization();
  const { isLocked, checkAccess } = useSubscriptionGuard();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    company_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('customer_id, total, paid_amount');

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

    if (!checkAccess('create or edit customers')) return;

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
    if (!checkAccess('edit customers')) return;
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      company_name: customer.company_name || '',
      notes: customer.notes || '',
    });
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

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      company_name: '',
      notes: '',
    });
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
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      onProgress?.(i + 1, data.length);
      
      try {
        const customerData = {
          name: row.name || row['Name'] || '',
          phone: row.phone || row['Phone'] || null,
          email: row.email || row['Email'] || null,
          company_name: row.company_name || row['Company'] || null,
          address: row.address || row['Address'] || null,
          notes: row.notes || row['Notes'] || null,
          organization_id: organization?.id,
        };

        if (!customerData.name) {
          failed++;
          errors.push(`Row ${i + 1}: Name not provided`);
          continue;
        }

        const { error } = await supabase.from('customers').insert([customerData]);
        
        if (error) {
          failed++;
          errors.push(`${customerData.name}: ${error.message}`);
        } else {
          success++;
        }
      } catch (err: any) {
        failed++;
        errors.push(err.message || 'Unknown error');
      }
    }

    if (success > 0) {
      fetchCustomers();
    }

    return { success, failed, errors };
  };

  // Stats
  const totalCustomers = customers.length;
  const totalInvoiced = customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0);
  const totalPaid = customers.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalDue = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Customer List</h1>
          <p className="text-sm text-muted-foreground">
            Manage all customer information and view their ledger
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Customers</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{totalCustomers}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Invoiced</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalInvoiced)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-success uppercase tracking-wide">Total Paid</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <p className="text-xs font-medium text-destructive uppercase tracking-wide">Total Due</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{formatCurrency(totalDue)}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-card rounded-xl shadow-sm border border-border/50">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 h-10"
              />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
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
                if (open && !checkAccess('add new customers')) return;
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-10 gap-2 shadow-sm" disabled={isLocked}>
                    {isLocked ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
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
                      className="p-4 hover:bg-muted/30 transition-colors duration-150 cursor-pointer"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
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

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                          Contact
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 whitespace-nowrap">
                          Company
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                          Total Invoiced
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                          Paid
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap">
                          Due
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground sticky top-0 bg-muted/30 text-right whitespace-nowrap w-[120px]">
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
                            'hover:bg-primary/5'
                          )}
                          onClick={() => navigate(`/customers/${customer.id}`)}
                        >
                          <TableCell className="whitespace-nowrap">
                            <span className="font-semibold text-foreground">{customer.name}</span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                                  <span className="truncate max-w-[180px]">{customer.email}</span>
                                </div>
                              )}
                              {!customer.phone && !customer.email && (
                                <span className="text-sm text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">
                            {customer.company_name || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-foreground whitespace-nowrap tabular-nums">
                            {formatCurrency(customer.total_invoiced || 0)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            <span className="text-success font-medium">
                              {formatCurrency(customer.total_paid || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            <span className={cn(
                              'font-medium',
                              (customer.total_due || 0) > 0 ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                              {formatCurrency(customer.total_due || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </TooltipProvider>
  );
};

export default Customers;
