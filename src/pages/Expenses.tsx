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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, Search, Wallet, Calendar, Filter, Download, 
  Building2, Eye, Edit2, Phone, Mail, AlertCircle,
  FileText, CreditCard, Receipt, Tag, Trash2, Users, Pencil
} from "lucide-react";
import { VendorSelect } from "@/components/shared/VendorSelect";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { parseValidatedFloat } from "@/lib/validation";

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  payment_method: string;
  category_id: string | null;
  vendor_id: string | null;
  created_at: string;
  category?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  expense_count?: number;
}

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

const Expenses = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { organization, orgRole } = useOrganization();
  
  // Expense permissions
  const canViewExpenses = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expenses', 'view');
  const canCreateExpenses = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expenses', 'create');
  const canEditExpenses = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expenses', 'edit');
  const canDeleteExpenses = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expenses', 'delete');
  const canExportExpenses = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expenses', 'export');
  
  // Category permissions
  const canViewCategories = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expense_categories', 'view');
  const canCreateCategories = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expense_categories', 'create');
  const canEditCategories = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expense_categories', 'edit');
  const canDeleteCategories = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'expense_categories', 'delete');
  
  // Vendor permissions (for quick access from this page)
  const canCreateVendors = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'create');
  const canEditVendors = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'edit');
  const canDeleteVendors = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'vendors', 'delete');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<{ open: boolean; category: Category | null }>({
    open: false,
    category: null,
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });
  
  const [expenseFormData, setExpenseFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    payment_method: "cash",
    category_id: "",
    vendor_id: "",
  });

  const [vendorFormData, setVendorFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    bank_info: "",
    notes: "",
  });

  const [billFormData, setBillFormData] = useState({
    vendor_id: "",
    bill_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    description: "",
    due_date: "",
  });

  const [paymentFormData, setPaymentFormData] = useState({
    vendor_id: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    if (organization?.id) {
      fetchData();
    }
  }, [filterCategory, filterVendor, filterMonth, organization?.id]);

  const fetchData = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Fetch categories - scoped to organization
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      setCategories(categoriesData || []);

      // Fetch vendors with dues - scoped to organization
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (vendorsData) {
        const vendorsWithDues = await Promise.all(
          vendorsData.map(async (vendor) => {
            const { data: bills } = await supabase
              .from("vendor_bills")
              .select("amount")
              .eq("vendor_id", vendor.id)
              .eq("organization_id", organization.id);

            const { data: payments } = await supabase
              .from("vendor_payments")
              .select("amount")
              .eq("vendor_id", vendor.id)
              .eq("organization_id", organization.id);

            const totalBills = bills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
            const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

            return {
              ...vendor,
              total_bills: totalBills,
              total_paid: totalPaid,
              due_amount: totalBills - totalPaid,
            };
          })
        );
        setVendors(vendorsWithDues);
      }

      // Fetch expenses with filters - scoped to organization
      let query = supabase
        .from("expenses")
        .select(`
          *,
          category:expense_categories(id, name),
          vendor:vendors(id, name)
        `)
        .eq("organization_id", organization.id)
        .order("date", { ascending: false });

      if (filterCategory && filterCategory !== "all") {
        query = query.eq("category_id", filterCategory);
      }

      if (filterVendor && filterVendor !== "all") {
        query = query.eq("vendor_id", filterVendor);
      }

      if (filterMonth) {
        const startDate = `${filterMonth}-01`;
        const endDate = `${filterMonth}-31`;
        query = query.gte("date", startDate).lte("date", endDate);
      }

      const { data: expensesData } = await query;
      setExpenses(expensesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double submission

    if (!expenseFormData.description || !expenseFormData.amount) {
      toast.error("Please enter description and amount");
      return;
    }

    // Validate amount
    let validatedAmount: number;
    try {
      validatedAmount = parseValidatedFloat(expenseFormData.amount, 'Amount', 0.01, 100000000);
    } catch (validationError: any) {
      toast.error(validationError.message);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingExpense) {
        const { error, data } = await supabase
          .from("expenses")
          .update({
            date: expenseFormData.date,
            description: expenseFormData.description,
            amount: validatedAmount,
            payment_method: expenseFormData.payment_method,
            category_id: expenseFormData.category_id || null,
            vendor_id: expenseFormData.vendor_id || null,
          })
          .eq("id", editingExpense.id)
          .select();

        if (error) {
          console.error("Expense update error:", error);
          throw error;
        }
        
        toast.success("Expense updated successfully");
      } else {
        const { error } = await supabase.from("expenses").insert({
          date: expenseFormData.date,
          description: expenseFormData.description,
          amount: validatedAmount,
          payment_method: expenseFormData.payment_method,
          category_id: expenseFormData.category_id || null,
          vendor_id: expenseFormData.vendor_id || null,
          organization_id: organization?.id,
        });

        if (error) throw error;
        toast.success("Expense saved successfully");
      }

      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      await fetchData(); // Ensure data is refetched
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast.error(error?.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      toast.success("Expense deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const openEditExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseFormData({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method || "cash",
      category_id: expense.category_id || "",
      vendor_id: expense.vendor_id || "",
    });
    setIsExpenseDialogOpen(true);
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!vendorFormData.name) {
      toast.error("Please enter vendor name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(vendorFormData)
          .eq("id", editingVendor.id);

        if (error) throw error;
        toast.success("Vendor updated successfully");
      } else {
        const { error } = await supabase.from("vendors").insert({
          ...vendorFormData,
          organization_id: organization?.id,
        });
        if (error) throw error;
        toast.success("Vendor added successfully");
      }

      setIsVendorDialogOpen(false);
      resetVendorForm();
      await fetchData();
    } catch (error: any) {
      console.error("Error saving vendor:", error);
      toast.error(error?.message || "Failed to save vendor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!billFormData.vendor_id || !billFormData.amount) {
      toast.error("Please select vendor and enter amount");
      return;
    }

    // Validate amount
    let validatedAmount: number;
    try {
      validatedAmount = parseValidatedFloat(billFormData.amount, 'Bill amount', 0.01, 100000000);
    } catch (validationError: any) {
      toast.error(validationError.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_bills").insert({
        vendor_id: billFormData.vendor_id,
        bill_date: billFormData.bill_date,
        amount: validatedAmount,
        description: billFormData.description || null,
        due_date: billFormData.due_date || null,
        organization_id: organization?.id,
      });

      if (error) throw error;

      toast.success("Bill saved successfully");
      setIsBillDialogOpen(false);
      resetBillForm();
      await fetchData();
    } catch (error: any) {
      console.error("Error saving bill:", error);
      toast.error(error?.message || "Failed to save bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!paymentFormData.vendor_id || !paymentFormData.amount) {
      toast.error("Please select vendor and enter amount");
      return;
    }

    // Validate amount
    let validatedAmount: number;
    try {
      validatedAmount = parseValidatedFloat(paymentFormData.amount, 'Payment amount', 0.01, 100000000);
    } catch (validationError: any) {
      toast.error(validationError.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_payments").insert({
        vendor_id: paymentFormData.vendor_id,
        payment_date: paymentFormData.payment_date,
        amount: validatedAmount,
        payment_method: paymentFormData.payment_method,
        notes: paymentFormData.notes || null,
        organization_id: organization?.id,
      });

      if (error) throw error;

      toast.success("Payment saved successfully");
      setIsPaymentDialogOpen(false);
      resetPaymentForm();
      await fetchData();
    } catch (error: any) {
      console.error("Error saving payment:", error);
      toast.error(error?.message || "Failed to save payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      amount: "",
      payment_method: "cash",
      category_id: "",
      vendor_id: "",
    });
    setEditingExpense(null);
  };

  const resetVendorForm = () => {
    setVendorFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      bank_info: "",
      notes: "",
    });
    setEditingVendor(null);
  };

  const resetBillForm = () => {
    setBillFormData({
      vendor_id: "",
      bill_date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      description: "",
      due_date: "",
    });
    setSelectedVendorId("");
  };

  const resetPaymentForm = () => {
    setPaymentFormData({
      vendor_id: "",
      payment_date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      payment_method: "cash",
      notes: "",
    });
    setSelectedVendorId("");
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
    });
    setEditingCategory(null);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // Prevent double submission

    if (!categoryFormData.name) {
      toast.error("Please enter category name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("expense_categories")
          .update({
            name: categoryFormData.name,
            description: categoryFormData.description || null,
          })
          .eq("id", editingCategory.id);

        if (error) {
          console.error("Category update error:", error);
          throw error;
        }
        toast.success("Category updated successfully");
      } else {
        const { error } = await supabase.from("expense_categories").insert({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
          organization_id: organization?.id,
        });
        if (error) throw error;
        toast.success("Category added successfully");
      }

      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      await fetchData();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error?.message || "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryConfirm.category) return;
    
    const categoryId = deleteCategoryConfirm.category.id;
    const expenseCount = expenses.filter(e => e.category_id === categoryId).length;
    
    if (expenseCount > 0) {
      toast.error(`Cannot delete: This category is used by ${expenseCount} expense(s)`);
      setDeleteCategoryConfirm({ open: false, category: null });
      return;
    }

    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast.success("Category deleted successfully");
      setDeleteCategoryConfirm({ open: false, category: null });
      fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const openEditVendorDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorFormData({
      name: vendor.name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      bank_info: vendor.bank_info || "",
      notes: vendor.notes || "",
    });
    setIsVendorDialogOpen(true);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm("Are you sure you want to delete this vendor? Related bills and payments will also be deleted.")) return;

    try {
      // Delete related bills and payments first
      await supabase.from("vendor_payments").delete().eq("vendor_id", vendorId);
      await supabase.from("vendor_bills").delete().eq("vendor_id", vendorId);
      
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", vendorId);

      if (error) throw error;
      toast.success("Vendor deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("Failed to delete vendor");
    }
  };

  const openVendorExpenseDialog = (vendorId: string) => {
    setExpenseFormData({
      ...expenseFormData,
      vendor_id: vendorId,
    });
    setIsExpenseDialogOpen(true);
  };

  const openVendorBillDialog = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setBillFormData({
      ...billFormData,
      vendor_id: vendorId,
    });
    setIsBillDialogOpen(true);
  };

  const openVendorPaymentDialog = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setPaymentFormData({
      ...paymentFormData,
      vendor_id: vendorId,
    });
    setIsPaymentDialogOpen(true);
  };

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
      vendor.phone?.includes(vendorSearchTerm) ||
      vendor.email?.toLowerCase().includes(vendorSearchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalVendorDue = vendors.reduce((sum, v) => sum + (v.due_amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "cash":
        return <Badge variant="outline">Cash</Badge>;
      case "bank":
        return <Badge variant="secondary">Bank</Badge>;
      case "bkash":
        return <Badge className="bg-pink-500">bKash</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const expenseHeaders = {
    date: 'Date',
    description: 'Description',
    category: 'Category',
    vendor: 'Vendor',
    payment_method: 'Payment',
    amount: 'Amount',
  };

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    if (filteredExpenses.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const exportData = filteredExpenses.map(exp => ({
      date: format(new Date(exp.date), 'dd/MM/yyyy'),
      description: exp.description,
      category: exp.category?.name || '',
      vendor: exp.vendor?.name || '',
      payment_method: exp.payment_method === 'cash' ? 'Cash' : exp.payment_method === 'bank' ? 'Bank' : 'bKash',
      amount: exp.amount,
    }));

    if (exportFormat === 'csv') {
      exportToCSV(exportData, 'expenses', expenseHeaders);
    } else {
      exportToExcel(exportData, 'expenses', expenseHeaders);
    }
    toast.success(`Downloading ${exportFormat.toUpperCase()} file`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage vendors and daily expenses</p>
        </div>
      </div>

      {/* Summary Cards - Polished */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Vendors
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold tabular-nums">{vendors.length}</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Vendor Bills
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_bills || 0), 0))}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200/50 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/20 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Vendor Due
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(totalVendorDue)}</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Daily Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - Polished */}
      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList className="h-11 p-1 bg-muted/50">
          <TabsTrigger 
            value="vendors" 
            className="gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200"
          >
            <Building2 className="h-4 w-4" />
            <span>Vendors</span>
          </TabsTrigger>
          <TabsTrigger 
            value="expenses" 
            className="gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200"
          >
            <Wallet className="h-4 w-4" />
            <span>Expenses</span>
          </TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="gap-2 px-4 h-9 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:font-semibold transition-all duration-200"
          >
            <Tag className="h-4 w-4" />
            <span>Categories</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
              <Input
                placeholder="Search vendors..."
                value={vendorSearchTerm}
                onChange={(e) => setVendorSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-muted/40 border-muted/60 focus-visible:ring-1 focus-visible:ring-primary transition-all duration-200"
              />
            </div>
            {canCreateVendors && (
              <div className="flex flex-wrap gap-2">
                {/* Bill Dialog */}
                <Dialog open={isBillDialogOpen} onOpenChange={(open) => {
                  setIsBillDialogOpen(open);
                  if (!open) resetBillForm();
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 border-muted/60 hover:bg-muted/50 transition-all duration-200">
                      <FileText className="h-4 w-4" />
                      Add Bill
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Vendor Bill</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBillSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Vendor *</Label>
                        <VendorSelect
                          value={billFormData.vendor_id}
                          onValueChange={(value) =>
                            setBillFormData({ ...billFormData, vendor_id: value })
                          }
                          vendors={vendors}
                          onVendorAdded={fetchData}
                          placeholder="Select vendor"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Bill Date</Label>
                          <Input
                            type="date"
                            value={billFormData.bill_date}
                            onChange={(e) =>
                              setBillFormData({ ...billFormData, bill_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={billFormData.amount}
                            onChange={(e) =>
                              setBillFormData({ ...billFormData, amount: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Bill description"
                          value={billFormData.description}
                          onChange={(e) =>
                            setBillFormData({ ...billFormData, description: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                          type="date"
                          value={billFormData.due_date}
                          onChange={(e) =>
                            setBillFormData({ ...billFormData, due_date: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsBillDialogOpen(false);
                            resetBillForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Payment Dialog */}
                <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                  setIsPaymentDialogOpen(open);
                  if (!open) resetPaymentForm();
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 border-muted/60 hover:bg-muted/50 transition-all duration-200">
                      <CreditCard className="h-4 w-4" />
                      Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Make Vendor Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Vendor *</Label>
                        <VendorSelect
                          value={paymentFormData.vendor_id}
                          onValueChange={(value) =>
                            setPaymentFormData({ ...paymentFormData, vendor_id: value })
                          }
                          vendors={vendors}
                          onVendorAdded={fetchData}
                          placeholder="Select vendor"
                          showDueAmount
                          formatCurrency={formatCurrency}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Payment Date</Label>
                          <Input
                            type="date"
                            value={paymentFormData.payment_date}
                            onChange={(e) =>
                              setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={paymentFormData.amount}
                            onChange={(e) =>
                              setPaymentFormData({ ...paymentFormData, amount: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select
                          value={paymentFormData.payment_method}
                          onValueChange={(value) =>
                            setPaymentFormData({ ...paymentFormData, payment_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="bkash">bKash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Payment notes"
                          value={paymentFormData.notes}
                          onChange={(e) =>
                            setPaymentFormData({ ...paymentFormData, notes: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsPaymentDialogOpen(false);
                            resetPaymentForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Vendor Dialog */}
                <Dialog open={isVendorDialogOpen} onOpenChange={(open) => {
                  setIsVendorDialogOpen(open);
                  if (!open) resetVendorForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 h-10 shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]">
                      <Plus className="h-4 w-4" />
                      Add Vendor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVendorSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">Name *</Label>
                        <Input
                          id="vendor_name"
                          placeholder="Vendor name"
                          value={vendorFormData.name}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor_phone">Phone</Label>
                          <Input
                            id="vendor_phone"
                            placeholder="Phone number"
                            value={vendorFormData.phone}
                            onChange={(e) =>
                              setVendorFormData({ ...vendorFormData, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor_email">Email</Label>
                          <Input
                            id="vendor_email"
                            type="email"
                            placeholder="Email"
                            value={vendorFormData.email}
                            onChange={(e) =>
                              setVendorFormData({ ...vendorFormData, email: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_address">Address</Label>
                        <Textarea
                          id="vendor_address"
                          placeholder="Address"
                          value={vendorFormData.address}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, address: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_bank_info">Bank Info</Label>
                        <Textarea
                          id="vendor_bank_info"
                          placeholder="Bank account number, branch, etc."
                          value={vendorFormData.bank_info}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, bank_info: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_notes">Notes</Label>
                        <Textarea
                          id="vendor_notes"
                          placeholder="Additional information"
                          value={vendorFormData.notes}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, notes: e.target.value })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => {
                            setIsVendorDialogOpen(false);
                            resetVendorForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Saving..." : (editingVendor ? "Update" : "Save")}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Vendors Table - Polished */}
          <div className="border border-border/60 rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-semibold h-12">Name</TableHead>
                  <TableHead className="font-semibold h-12">Contact</TableHead>
                  <TableHead className="font-semibold h-12 text-right">Total Bills</TableHead>
                  <TableHead className="font-semibold h-12 text-right">Paid</TableHead>
                  <TableHead className="font-semibold h-12 text-right">Due</TableHead>
                  <TableHead className="font-semibold h-12 text-center">Actions</TableHead>
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
                        description={vendorSearchTerm 
                          ? "Try adjusting your search criteria" 
                          : "Add your first vendor to start tracking purchases"}
                        action={canCreateVendors && !vendorSearchTerm ? {
                          label: "Add Vendor",
                          onClick: () => setIsVendorDialogOpen(true),
                          icon: Plus,
                        } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} className="hover:bg-muted/30 transition-colors duration-150">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{vendor.name}</p>
                            {vendor.address && (
                              <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                                {vendor.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{vendor.phone}</span>
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{vendor.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right font-medium tabular-nums">
                        {formatCurrency(vendor.total_bills || 0)}
                      </TableCell>
                      <TableCell className="py-4 text-right font-medium text-green-600 dark:text-green-400 tabular-nums">
                        {formatCurrency(vendor.total_paid || 0)}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        {(vendor.due_amount || 0) > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 tabular-nums">
                            {formatCurrency(vendor.due_amount || 0)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Paid
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                                onClick={() => navigate(`/vendors/${vendor.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                          {canEditVendors && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                                    onClick={() => openEditVendorDialog(vendor)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              {canDeleteVendors && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                                      onClick={() => handleDeleteVendor(vendor.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 px-2.5 border-muted/60 hover:bg-muted/50 transition-all duration-200">
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    <span className="text-xs">Add</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openVendorBillDialog(vendor.id)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Add Bill
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVendorPaymentDialog(vendor.id)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Make Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVendorExpenseDialog(vendor.id)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Daily Expense
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Daily Expenses Tab - Polished */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-muted/40 border-muted/60 focus-visible:ring-1 focus-visible:ring-primary transition-all duration-200"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            </div>
            <div className="flex gap-2">
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
              <Dialog open={isExpenseDialogOpen} onOpenChange={(open) => {
                setIsExpenseDialogOpen(open);
                if (!open) resetExpenseForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expense_date">Date</Label>
                        <Input
                          id="expense_date"
                          type="date"
                          value={expenseFormData.date}
                          onChange={(e) =>
                            setExpenseFormData({ ...expenseFormData, date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expense_amount">Amount</Label>
                        <Input
                          id="expense_amount"
                          type="number"
                          placeholder="0"
                          value={expenseFormData.amount}
                          onChange={(e) =>
                            setExpenseFormData({ ...expenseFormData, amount: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_vendor">Vendor</Label>
                      <Select
                        value={expenseFormData.vendor_id}
                        onValueChange={(value) =>
                          setExpenseFormData({ ...expenseFormData, vendor_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_category">Category</Label>
                      <Select
                        value={expenseFormData.category_id}
                        onValueChange={(value) =>
                          setExpenseFormData({ ...expenseFormData, category_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_description">Description</Label>
                      <Textarea
                        id="expense_description"
                        placeholder="Enter expense description"
                        value={expenseFormData.description}
                        onChange={(e) =>
                          setExpenseFormData({ ...expenseFormData, description: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_payment_method">Payment Method</Label>
                      <Select
                        value={expenseFormData.payment_method}
                        onValueChange={(value) =>
                          setExpenseFormData({ ...expenseFormData, payment_method: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="bkash">bKash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => {
                          setIsExpenseDialogOpen(false);
                          resetExpenseForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : (editingExpense ? "Update" : "Save")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {(canEditExpenses || canDeleteExpenses) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={(canEditExpenses || canDeleteExpenses) ? 7 : 6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(canEditExpenses || canDeleteExpenses) ? 7 : 6} className="py-0">
                      <EmptyState
                        illustration="expense"
                        title="No expenses found"
                        description={searchTerm || filterCategory !== "all" || filterVendor !== "all" 
                          ? "Try adjusting your search or filter criteria" 
                          : "Record your first expense to start tracking"}
                        action={canCreateExpenses && !searchTerm && filterCategory === "all" && filterVendor === "all" ? {
                          label: "Add Expense",
                          onClick: () => setIsExpenseDialogOpen(true),
                          icon: Plus,
                        } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.vendor?.name ? (
                          <Badge variant="outline">{expense.vendor.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.category?.name ? (
                          <Badge variant="secondary">{expense.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(expense.payment_method || "cash")}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      {(canEditExpenses || canDeleteExpenses) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditExpenseDialog(expense)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold">Expense Categories</h2>
              <p className="text-sm text-muted-foreground">Create categories by expense type</p>
            </div>
            {canCreateCategories && (
              <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                setIsCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Add New Category"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category_name">Name *</Label>
                      <Input
                        id="category_name"
                        placeholder="Category name"
                        value={categoryFormData.name}
                        onChange={(e) =>
                          setCategoryFormData({ ...categoryFormData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category_description">Description</Label>
                      <Textarea
                        id="category_description"
                        placeholder="Category description"
                        value={categoryFormData.description}
                        onChange={(e) =>
                          setCategoryFormData({ ...categoryFormData, description: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          resetCategoryForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : (editingCategory ? "Update" : "Save")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Categories Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading...
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  icon={Tag}
                  title="No categories yet"
                  description="Create expense categories to organize your spending"
                  action={canCreateCategories ? {
                    label: "Add Category",
                    onClick: () => setIsCategoryDialogOpen(true),
                    icon: Plus,
                  } : undefined}
                />
              </div>
            ) : (
              categories.map((category) => {
                const expenseCount = expenses.filter(e => e.category_id === category.id).length;
                const hasLinkedExpenses = expenseCount > 0;
                
                return (
                  <Card key={category.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </div>
                        {(canEditCategories || canDeleteCategories) && (
                          <div className="flex gap-1">
                            {canEditCategories && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditCategoryDialog(category)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Category</TooltipContent>
                              </Tooltip>
                            )}
                            {canDeleteCategories && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      disabled={hasLinkedExpenses}
                                      onClick={() => setDeleteCategoryConfirm({ open: true, category })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {hasLinkedExpenses 
                                    ? `Cannot delete: ${expenseCount} expense(s) linked` 
                                    : "Delete Category"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {category.description || "No description"}
                      </p>
                      <div className="mt-3 text-sm">
                        <Badge variant="outline">
                          {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Category Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteCategoryConfirm.open}
        onOpenChange={(open) => setDeleteCategoryConfirm({ open, category: open ? deleteCategoryConfirm.category : null })}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteCategoryConfirm.category?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteCategory}
      />
    </div>
  );
};

export default Expenses;
