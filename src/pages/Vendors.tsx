import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { canRolePerform, OrgRole } from "@/lib/permissions/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Phone, Mail, Building2, AlertCircle, Trash2, Download, Upload, Pencil, ChevronLeft, ChevronRight, MoreHorizontal, DollarSign } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import { ImportResult } from "@/lib/importUtils";
import CSVImportDialog from "@/components/import/CSVImportDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SortableTableHeader, type SortDirection } from "@/components/shared/SortableTableHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  bank_info: string | null;
  notes: string | null;
  total_bills?: number;
  total_paid?: number;
  due_amount?: number;
}

const Vendors = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { organization, orgRole } = useOrganization();
  
  const canView = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'view');
  const canCreate = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'create');
  const canEdit = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'edit');
  const canDelete = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'delete');
  const canImport = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'import');
  const canExport = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'export');
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    bank_info: "",
    notes: "",
  });
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (organization?.id) {
      fetchVendors();
    }
  }, [organization?.id]);

  const fetchVendors = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("id, name, phone, email, address, bank_info, notes")
        .eq("organization_id", organization.id)
        .order("name");

      if (!vendorsData) {
        setVendors([]);
        return;
      }

      // Batch fetch all bills and payments in 2 queries instead of N+1
      const [allBillsRes, allPaymentsRes] = await Promise.all([
        supabase
          .from("vendor_bills")
          .select("vendor_id, net_amount, amount, discount")
          .eq("organization_id", organization.id),
        supabase
          .from("vendor_payments")
          .select("vendor_id, amount")
          .eq("organization_id", organization.id),
      ]);

      const allBills = allBillsRes.data || [];
      const allPayments = allPaymentsRes.data || [];

      // Group by vendor_id in JS
      const billsByVendor = new Map<string, number>();
      for (const b of allBills) {
        const netAmount = (b as any).net_amount ?? (Number(b.amount) - Number((b as any).discount || 0));
        billsByVendor.set(b.vendor_id, (billsByVendor.get(b.vendor_id) || 0) + netAmount);
      }

      const paymentsByVendor = new Map<string, number>();
      for (const p of allPayments) {
        paymentsByVendor.set(p.vendor_id, (paymentsByVendor.get(p.vendor_id) || 0) + Number(p.amount));
      }

      const vendorsWithDues = vendorsData.map((vendor) => {
        const totalBills = billsByVendor.get(vendor.id) || 0;
        const totalPaid = paymentsByVendor.get(vendor.id) || 0;
        return {
          ...vendor,
          total_bills: totalBills,
          total_paid: totalPaid,
          due_amount: totalBills - totalPaid,
        };
      });

      setVendors(vendorsWithDues);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please enter vendor name");
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(formData)
          .eq("id", editingVendor.id);

        if (error) throw error;
        toast.success("Vendor updated");
      } else {
        const { error } = await supabase.from("vendors").insert({
          ...formData,
          organization_id: organization?.id,
        });

        if (error) throw error;
        toast.success("Vendor added");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVendors();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save vendor");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      bank_info: "",
      notes: "",
    });
    setEditingVendor(null);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      bank_info: vendor.bank_info || "",
      notes: vendor.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteVendorId) return;
    
    try {
      await supabase.from('vendor_payments').delete().eq('vendor_id', deleteVendorId);
      await supabase.from('vendor_bills').delete().eq('vendor_id', deleteVendorId);
      const { error } = await supabase.from('vendors').delete().eq('id', deleteVendorId);
      if (error) throw error;
      
      toast.success('Vendor deleted');
      setDeleteVendorId(null);
      fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor');
    }
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset page on search
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortDirection(null); setSortKey(null); }
      else setSortDirection('asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedVendors = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredVendors;
    return [...filteredVendors].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'total_bills': aVal = a.total_bills || 0; bVal = b.total_bills || 0; break;
        case 'total_paid': aVal = a.total_paid || 0; bVal = b.total_paid || 0; break;
        case 'due_amount': aVal = a.due_amount || 0; bVal = b.due_amount || 0; break;
        default: return 0;
      }
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredVendors, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedVendors.length / PAGE_SIZE);
  const paginatedVendors = sortedVendors.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalDue = vendors.reduce((sum, v) => sum + (v.due_amount || 0), 0);
  const totalPaid = vendors.reduce((sum, v) => sum + (v.total_paid || 0), 0);
  const totalBills = vendors.reduce((sum, v) => sum + (v.total_bills || 0), 0);

  const vendorExportHeaders = {
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    bank_info: 'Bank Info',
    notes: 'Notes',
  };

  const vendorImportFields = ['name'];

  const handleExportCSV = () => {
    const exportData = vendors.map(v => ({
      name: v.name, phone: v.phone || '', email: v.email || '',
      address: v.address || '', bank_info: v.bank_info || '', notes: v.notes || '',
    }));
    exportToCSV(exportData, 'vendors', vendorExportHeaders);
  };

  const handleExportExcel = () => {
    const exportData = vendors.map(v => ({
      name: v.name, phone: v.phone || '', email: v.email || '',
      address: v.address || '', bank_info: v.bank_info || '', notes: v.notes || '',
    }));
    exportToExcel(exportData, 'vendors', vendorExportHeaders);
  };

  const handleImport = async (
    data: Record<string, string>[],
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> => {
    let success = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    // Org-scoped duplicate check
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('email, phone, name')
      .eq('organization_id', organization?.id);

    const existingEmails = new Set(existingVendors?.filter(v => v.email).map(v => v.email!.toLowerCase()) || []);
    const existingPhones = new Set(existingVendors?.filter(v => v.phone).map(v => v.phone!.replace(/\D/g, '')) || []);
    const existingNames = new Set(existingVendors?.map(v => v.name.toLowerCase()) || []);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      onProgress?.(i + 1, data.length);
      
      try {
        const name = (row.name || row['Name'] || '').trim();
        const phone = (row.phone || row['Phone'] || '').trim();
        const email = (row.email || row['Email'] || '').trim().toLowerCase();
        const address = (row.address || row['Address'] || '').trim();
        const bankInfo = (row.bank_info || row['Bank Info'] || row['bank'] || '').trim();
        const notes = (row.notes || row['Notes'] || '').trim();

        if (!name) { failed++; errors.push(`Row ${i + 2}: Name is required`); continue; }
        if (existingNames.has(name.toLowerCase())) { duplicates++; errors.push(`Row ${i + 2}: Vendor "${name}" already exists`); continue; }
        if (email && existingEmails.has(email)) { duplicates++; errors.push(`Row ${i + 2}: Email "${email}" already exists`); continue; }
        const normalizedPhone = phone.replace(/\D/g, '');
        if (normalizedPhone && existingPhones.has(normalizedPhone)) { duplicates++; errors.push(`Row ${i + 2}: Phone "${phone}" already exists`); continue; }

        const { error } = await supabase.from('vendors').insert({
          name, phone: phone || null, email: email || null,
          address: address || null, bank_info: bankInfo || null, notes: notes || null,
          organization_id: organization?.id,
        });

        if (error) { failed++; errors.push(`Row ${i + 2}: ${error.message}`); }
        else {
          success++;
          existingNames.add(name.toLowerCase());
          if (email) existingEmails.add(email);
          if (normalizedPhone) existingPhones.add(normalizedPhone);
        }
      } catch (err) { failed++; errors.push(`Row ${i + 2}: Unknown error`); }
    }

    if (success > 0) fetchVendors();
    return { success, failed, errors, duplicates };
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full min-w-0 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Vendors</h1>
          <p className="text-xs md:text-sm text-muted-foreground">All vendors and due balance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canImport && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />Import
            </Button>
          )}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>Export as Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Vendor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" placeholder="Vendor name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="01XXXXXXXXX" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" placeholder="Vendor address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_info">Bank Info</Label>
                    <Textarea id="bank_info" placeholder="Bank account number, branch, etc." value={formData.bank_info} onChange={(e) => setFormData({ ...formData, bank_info: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" placeholder="Additional information" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards — 4 col with Total Paid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Total Bills</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(totalBills)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-success flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Total Due
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold text-destructive">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full md:max-w-md" />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border rounded-lg p-4 space-y-3" style={{ opacity: 1 - i * 0.15 }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paginatedVendors.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No vendors found"
            description={searchTerm ? "Try adjusting your search criteria" : "Add your first vendor to start tracking purchases and payments"}
            action={canCreate && !searchTerm ? { label: "Add Vendor", onClick: () => setIsDialogOpen(true), icon: Plus } : undefined}
          />
        ) : (
          paginatedVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-card border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/vendors/${vendor.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-muted shrink-0">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{vendor.name}</p>
                    {vendor.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />{vendor.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {(vendor.due_amount || 0) > 0 ? (
                    <Badge variant="destructive" className="text-xs">{formatCurrency(vendor.due_amount || 0)}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-success border-success text-xs">Paid</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                <span>Bills: {formatCurrency(vendor.total_bills || 0)}</span>
                <span className="text-success">Paid: {formatCurrency(vendor.total_paid || 0)}</span>
              </div>
              <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => navigate(`/vendors/${vendor.id}`)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />View
                </Button>
                {canEdit && (
                  <Button variant="outline" size="sm" className="h-9" onClick={() => openEditDialog(vendor)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button variant="outline" size="sm" className="h-9 text-destructive hover:text-destructive" onClick={() => setDeleteVendorId(vendor.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableTableHeader label="Name" sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Total Bills" sortKey="total_bills" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Paid" sortKey="total_paid" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-right">
                <SortableTableHeader label="Due" sortKey="due_amount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
              </TableHead>
              <TableHead className="text-center w-[60px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex items-center gap-4 px-2" style={{ opacity: 1 - i * 0.1 }}>
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    icon={Building2}
                    title="No vendors found"
                    description={searchTerm ? "Try adjusting your search criteria" : "Add your first vendor to start tracking purchases and payments"}
                    action={canCreate && !searchTerm ? { label: "Add Vendor", onClick: () => setIsDialogOpen(true), icon: Plus } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              paginatedVendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">{vendor.address}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.phone && (<div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{vendor.phone}</div>)}
                      {vendor.email && (<div className="flex items-center gap-1 text-sm text-muted-foreground"><Mail className="h-3 w-3" />{vendor.email}</div>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(vendor.total_bills || 0)}</TableCell>
                  <TableCell className="text-right text-success tabular-nums">{formatCurrency(vendor.total_paid || 0)}</TableCell>
                  <TableCell className="text-right">
                    {(vendor.due_amount || 0) > 0 ? (
                      <Badge variant="destructive">{formatCurrency(vendor.due_amount || 0)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-success border-success">Paid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate(`/vendors/${vendor.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />View Details
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => openEditDialog(vendor)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteVendorId(vendor.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedVendors.length)} of {sortedVendors.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">{currentPage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Import Vendors"
        description="Upload a CSV file to import vendors. Required field: name"
        requiredFields={vendorImportFields}
        fieldMapping={vendorExportHeaders}
        onImport={handleImport}
        templateFilename="vendors"
      />

      <ConfirmDialog
        open={!!deleteVendorId}
        onOpenChange={() => setDeleteVendorId(null)}
        title="Delete Vendor"
        description="Are you sure you want to delete this vendor? This will also permanently delete all associated bills and payments."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
};

export default Vendors;
