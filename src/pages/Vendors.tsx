import { useState, useEffect } from "react";
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
import { Plus, Search, Eye, Phone, Mail, Building2, AlertCircle, Trash2, Download, Upload, Pencil } from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import { parseCSV, downloadTemplate, ImportResult } from "@/lib/importUtils";
import CSVImportDialog from "@/components/import/CSVImportDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  // Permission-based access controls
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
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (!vendorsData) {
        setVendors([]);
        return;
      }

      const vendorsWithDues = await Promise.all(
        vendorsData.map(async (vendor) => {
          // Fetch bills with net_amount (amount - discount) for correct due calculation
          const { data: bills } = await supabase
            .from("vendor_bills")
            .select("amount, discount, net_amount")
            .eq("vendor_id", vendor.id)
            .eq("organization_id", organization.id);

          const { data: payments } = await supabase
            .from("vendor_payments")
            .select("amount")
            .eq("vendor_id", vendor.id)
            .eq("organization_id", organization.id);

          // Use net_amount (after discount) for due calculation, fallback to amount - discount
          const totalNetBills = bills?.reduce((sum, b) => {
            const netAmount = b.net_amount ?? (Number(b.amount) - Number(b.discount || 0));
            return sum + netAmount;
          }, 0) || 0;
          const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

          return {
            ...vendor,
            total_bills: totalNetBills,
            total_paid: totalPaid,
            due_amount: totalNetBills - totalPaid,
          };
        })
      );

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This will also delete all associated bills and payments.')) return;
    
    try {
      // Delete payments first
      await supabase.from('vendor_payments').delete().eq('vendor_id', id);
      // Delete bills
      await supabase.from('vendor_bills').delete().eq('vendor_id', id);
      // Delete vendor
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Vendor deleted');
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

  const totalDue = vendors.reduce((sum, v) => sum + (v.due_amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
      name: v.name,
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      bank_info: v.bank_info || '',
      notes: v.notes || '',
    }));
    exportToCSV(exportData, 'vendors', vendorExportHeaders);
  };

  const handleExportExcel = () => {
    const exportData = vendors.map(v => ({
      name: v.name,
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      bank_info: v.bank_info || '',
      notes: v.notes || '',
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

    // Pre-fetch existing vendors for duplicate detection
    const { data: existingVendors } = await supabase
      .from('vendors')
      .select('email, phone, name');

    const existingEmails = new Set(
      existingVendors?.filter(v => v.email).map(v => v.email!.toLowerCase()) || []
    );
    const existingPhones = new Set(
      existingVendors?.filter(v => v.phone).map(v => v.phone!.replace(/\D/g, '')) || []
    );
    const existingNames = new Set(
      existingVendors?.map(v => v.name.toLowerCase()) || []
    );

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

        // Validate required field
        if (!name) {
          failed++;
          errors.push(`Row ${i + 2}: Name is required`);
          continue;
        }

        // Check for duplicates
        if (existingNames.has(name.toLowerCase())) {
          duplicates++;
          errors.push(`Row ${i + 2}: Vendor "${name}" already exists`);
          continue;
        }

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

        const { error } = await supabase.from('vendors').insert({
          name,
          phone: phone || null,
          email: email || null,
          address: address || null,
          bank_info: bankInfo || null,
          notes: notes || null,
          organization_id: organization?.id,
        });

        if (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        } else {
          success++;
          // Add to existing sets to prevent duplicates within batch
          existingNames.add(name.toLowerCase());
          if (email) existingEmails.add(email);
          if (normalizedPhone) existingPhones.add(normalizedPhone);
        }
      } catch (err) {
        failed++;
        errors.push(`Row ${i + 2}: Unknown error`);
      }
    }

    if (success > 0) {
      fetchVendors();
    }

    return { success, failed, errors, duplicates };
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Vendors</h1>
          <p className="text-xs md:text-sm text-muted-foreground">All vendors and due balance</p>
        </div>
      <div className="flex flex-wrap gap-2">
          {canImport && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          )}
          {canExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Vendor
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="Vendor name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Vendor address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_info">Bank Info</Label>
                  <Textarea
                    id="bank_info"
                    placeholder="Bank account number, branch, etc."
                    value={formData.bank_info}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_info: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional information"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards - 2-col tablet, 3-col desktop */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
              Total Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <p className="text-xl md:text-2xl font-bold">
              {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_bills || 0), 0))}
            </p>
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
        <Input
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:max-w-md"
        />
      </div>

      {/* Vendors Table - Responsive with horizontal scroll */}
      <div className="border rounded-lg overflow-x-auto -mx-3 md:mx-0">
        <div className="min-w-[600px]">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Total Bills</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    icon={Building2}
                    title="No vendors found"
                    description={searchTerm 
                      ? "Try adjusting your search criteria" 
                      : "Add your first vendor to start tracking purchases and payments"}
                    action={canCreate && !searchTerm ? {
                      label: "Add Vendor",
                      onClick: () => setIsDialogOpen(true),
                      icon: Plus,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {vendor.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(vendor.total_bills || 0)}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(vendor.total_paid || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(vendor.due_amount || 0) > 0 ? (
                      <Badge variant="destructive">{formatCurrency(vendor.due_amount || 0)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-success border-success">Paid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/vendors/${vendor.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(vendor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Vendor</TooltipContent>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(vendor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Vendor</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
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
    </div>
  );
};

export default Vendors;
