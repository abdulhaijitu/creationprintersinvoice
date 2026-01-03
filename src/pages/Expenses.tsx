import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  FileText, CreditCard, Receipt, Tag, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { exportToCSV, exportToExcel } from "@/lib/exportUtils";

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
  const { isAdmin } = useAuth();
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
    fetchData();
  }, [filterCategory, filterVendor, filterMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      setCategories(categoriesData || []);

      // Fetch vendors with dues
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (vendorsData) {
        const vendorsWithDues = await Promise.all(
          vendorsData.map(async (vendor) => {
            const { data: bills } = await supabase
              .from("vendor_bills")
              .select("amount")
              .eq("vendor_id", vendor.id);

            const { data: payments } = await supabase
              .from("vendor_payments")
              .select("amount")
              .eq("vendor_id", vendor.id);

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

      // Fetch expenses with filters
      let query = supabase
        .from("expenses")
        .select(`
          *,
          category:expense_categories(id, name),
          vendor:vendors(id, name)
        `)
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

    if (!expenseFormData.description || !expenseFormData.amount) {
      toast.error("বিবরণ এবং টাকার পরিমাণ দিন");
      return;
    }

    try {
      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update({
            date: expenseFormData.date,
            description: expenseFormData.description,
            amount: parseFloat(expenseFormData.amount),
            payment_method: expenseFormData.payment_method,
            category_id: expenseFormData.category_id || null,
            vendor_id: expenseFormData.vendor_id || null,
          })
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("খরচ আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("expenses").insert({
          date: expenseFormData.date,
          description: expenseFormData.description,
          amount: parseFloat(expenseFormData.amount),
          payment_method: expenseFormData.payment_method,
          category_id: expenseFormData.category_id || null,
          vendor_id: expenseFormData.vendor_id || null,
        });

        if (error) throw error;
        toast.success("খরচ সংরক্ষণ হয়েছে");
      }

      setIsExpenseDialogOpen(false);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("খরচ সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("আপনি কি এই খরচ মুছে ফেলতে চান?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      toast.success("খরচ মুছে ফেলা হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("খরচ মুছে ফেলা ব্যর্থ হয়েছে");
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

    if (!vendorFormData.name) {
      toast.error("ভেন্ডরের নাম দিন");
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(vendorFormData)
          .eq("id", editingVendor.id);

        if (error) throw error;
        toast.success("ভেন্ডর আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("vendors").insert(vendorFormData);
        if (error) throw error;
        toast.success("ভেন্ডর যোগ হয়েছে");
      }

      setIsVendorDialogOpen(false);
      resetVendorForm();
      fetchData();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("ভেন্ডর সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billFormData.vendor_id || !billFormData.amount) {
      toast.error("ভেন্ডর এবং টাকার পরিমাণ দিন");
      return;
    }

    try {
      const { error } = await supabase.from("vendor_bills").insert({
        vendor_id: billFormData.vendor_id,
        bill_date: billFormData.bill_date,
        amount: parseFloat(billFormData.amount),
        description: billFormData.description || null,
        due_date: billFormData.due_date || null,
      });

      if (error) throw error;

      toast.success("বিল সংরক্ষণ হয়েছে");
      setIsBillDialogOpen(false);
      resetBillForm();
      fetchData();
    } catch (error) {
      console.error("Error saving bill:", error);
      toast.error("বিল সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentFormData.vendor_id || !paymentFormData.amount) {
      toast.error("ভেন্ডর এবং টাকার পরিমাণ দিন");
      return;
    }

    try {
      const { error } = await supabase.from("vendor_payments").insert({
        vendor_id: paymentFormData.vendor_id,
        payment_date: paymentFormData.payment_date,
        amount: parseFloat(paymentFormData.amount),
        payment_method: paymentFormData.payment_method,
        notes: paymentFormData.notes || null,
      });

      if (error) throw error;

      toast.success("পেমেন্ট সংরক্ষণ হয়েছে");
      setIsPaymentDialogOpen(false);
      resetPaymentForm();
      fetchData();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("পেমেন্ট সংরক্ষণ ব্যর্থ হয়েছে");
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

    if (!categoryFormData.name) {
      toast.error("ক্যাটেগরির নাম দিন");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("expense_categories")
          .update({
            name: categoryFormData.name,
            description: categoryFormData.description || null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("ক্যাটেগরি আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("expense_categories").insert({
          name: categoryFormData.name,
          description: categoryFormData.description || null,
        });
        if (error) throw error;
        toast.success("ক্যাটেগরি যোগ হয়েছে");
      }

      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("ক্যাটেগরি সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("আপনি কি এই ক্যাটেগরি মুছে ফেলতে চান?")) return;

    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;
      toast.success("ক্যাটেগরি মুছে ফেলা হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("ক্যাটেগরি মুছে ফেলা ব্যর্থ হয়েছে");
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
    if (!confirm("আপনি কি এই ভেন্ডর মুছে ফেলতে চান? এর সাথে সম্পর্কিত বিল ও পেমেন্টও মুছে যাবে।")) return;

    try {
      // Delete related bills and payments first
      await supabase.from("vendor_payments").delete().eq("vendor_id", vendorId);
      await supabase.from("vendor_bills").delete().eq("vendor_id", vendorId);
      
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", vendorId);

      if (error) throw error;
      toast.success("ভেন্ডর মুছে ফেলা হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      toast.error("ভেন্ডর মুছে ফেলা ব্যর্থ হয়েছে");
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
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "cash":
        return <Badge variant="outline">নগদ</Badge>;
      case "bank":
        return <Badge variant="secondary">ব্যাংক</Badge>;
      case "bkash":
        return <Badge className="bg-pink-500">বিকাশ</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const expenseHeaders = {
    date: 'তারিখ',
    description: 'বিবরণ',
    category: 'ক্যাটেগরি',
    vendor: 'ভেন্ডর',
    payment_method: 'পেমেন্ট',
    amount: 'টাকা',
  };

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    if (filteredExpenses.length === 0) {
      toast.error('এক্সপোর্ট করার মতো ডেটা নেই');
      return;
    }
    
    const exportData = filteredExpenses.map(exp => ({
      date: format(new Date(exp.date), 'dd/MM/yyyy'),
      description: exp.description,
      category: exp.category?.name || '',
      vendor: exp.vendor?.name || '',
      payment_method: exp.payment_method === 'cash' ? 'নগদ' : exp.payment_method === 'bank' ? 'ব্যাংক' : 'বিকাশ',
      amount: exp.amount,
    }));

    if (exportFormat === 'csv') {
      exportToCSV(exportData, 'expenses', expenseHeaders);
    } else {
      exportToExcel(exportData, 'expenses', expenseHeaders);
    }
    toast.success(`${exportFormat.toUpperCase()} ফাইল ডাউনলোড হচ্ছে`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">খরচ ব্যবস্থাপনা</h1>
          <p className="text-muted-foreground">ভেন্ডর ও দৈনিক খরচের হিসাব</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              মোট ভেন্ডর
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              মোট ভেন্ডর বিল
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_bills || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              ভেন্ডর বকেয়া
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalVendorDue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              মোট দৈনিক খরচ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="h-4 w-4" />
            ভেন্ডর
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <Wallet className="h-4 w-4" />
            দৈনিক খরচ
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            ক্যাটেগরি
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ভেন্ডর খুঁজুন..."
                value={vendorSearchTerm}
                onChange={(e) => setVendorSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                {/* Bill Dialog */}
                <Dialog open={isBillDialogOpen} onOpenChange={(open) => {
                  setIsBillDialogOpen(open);
                  if (!open) resetBillForm();
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      বিল যোগ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>নতুন ভেন্ডর বিল যোগ করুন</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBillSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>ভেন্ডর *</Label>
                        <Select
                          value={billFormData.vendor_id}
                          onValueChange={(value) =>
                            setBillFormData({ ...billFormData, vendor_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="ভেন্ডর বাছুন" />
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>বিল তারিখ</Label>
                          <Input
                            type="date"
                            value={billFormData.bill_date}
                            onChange={(e) =>
                              setBillFormData({ ...billFormData, bill_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>টাকা *</Label>
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
                        <Label>বিবরণ</Label>
                        <Textarea
                          placeholder="বিলের বিবরণ"
                          value={billFormData.description}
                          onChange={(e) =>
                            setBillFormData({ ...billFormData, description: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>পরিশোধের তারিখ</Label>
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
                          বাতিল
                        </Button>
                        <Button type="submit">সংরক্ষণ করুন</Button>
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
                    <Button variant="outline" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      পেমেন্ট
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>ভেন্ডর পেমেন্ট করুন</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>ভেন্ডর *</Label>
                        <Select
                          value={paymentFormData.vendor_id}
                          onValueChange={(value) =>
                            setPaymentFormData({ ...paymentFormData, vendor_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="ভেন্ডর বাছুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name} {vendor.due_amount && vendor.due_amount > 0 ? `(বকেয়া: ${formatCurrency(vendor.due_amount)})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>পেমেন্ট তারিখ</Label>
                          <Input
                            type="date"
                            value={paymentFormData.payment_date}
                            onChange={(e) =>
                              setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>টাকা *</Label>
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
                        <Label>পেমেন্ট মেথড</Label>
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
                            <SelectItem value="cash">নগদ</SelectItem>
                            <SelectItem value="bank">ব্যাংক</SelectItem>
                            <SelectItem value="bkash">বিকাশ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>নোট</Label>
                        <Textarea
                          placeholder="পেমেন্টের নোট"
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
                          বাতিল
                        </Button>
                        <Button type="submit">সংরক্ষণ করুন</Button>
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
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      নতুন ভেন্ডর
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingVendor ? "ভেন্ডর সম্পাদনা" : "নতুন ভেন্ডর যোগ করুন"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleVendorSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">নাম *</Label>
                        <Input
                          id="vendor_name"
                          placeholder="ভেন্ডরের নাম"
                          value={vendorFormData.name}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vendor_phone">ফোন</Label>
                          <Input
                            id="vendor_phone"
                            placeholder="01XXXXXXXXX"
                            value={vendorFormData.phone}
                            onChange={(e) =>
                              setVendorFormData({ ...vendorFormData, phone: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendor_email">ইমেইল</Label>
                          <Input
                            id="vendor_email"
                            type="email"
                            placeholder="email@example.com"
                            value={vendorFormData.email}
                            onChange={(e) =>
                              setVendorFormData({ ...vendorFormData, email: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_address">ঠিকানা</Label>
                        <Textarea
                          id="vendor_address"
                          placeholder="ভেন্ডরের ঠিকানা"
                          value={vendorFormData.address}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, address: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_bank_info">ব্যাংক তথ্য</Label>
                        <Textarea
                          id="vendor_bank_info"
                          placeholder="ব্যাংক একাউন্ট নম্বর, ব্র্যাঞ্চ ইত্যাদি"
                          value={vendorFormData.bank_info}
                          onChange={(e) =>
                            setVendorFormData({ ...vendorFormData, bank_info: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vendor_notes">নোট</Label>
                        <Textarea
                          id="vendor_notes"
                          placeholder="অতিরিক্ত তথ্য"
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
                          onClick={() => {
                            setIsVendorDialogOpen(false);
                            resetVendorForm();
                          }}
                        >
                          বাতিল
                        </Button>
                        <Button type="submit">সংরক্ষণ করুন</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Vendors Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>নাম</TableHead>
                  <TableHead>যোগাযোগ</TableHead>
                  <TableHead className="text-right">মোট বিল</TableHead>
                  <TableHead className="text-right">পরিশোধ</TableHead>
                  <TableHead className="text-right">বকেয়া</TableHead>
                  <TableHead className="text-center">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      কোনো ভেন্ডর পাওয়া যায়নি
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
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(vendor.total_paid || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(vendor.due_amount || 0) > 0 ? (
                          <Badge variant="destructive">{formatCurrency(vendor.due_amount || 0)}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">পরিশোধিত</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/vendors/${vendor.id}`)}
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditVendorDialog(vendor)}
                                title="সম্পাদনা করুন"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVendor(vendor.id)}
                                title="মুছে ফেলুন"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    যোগ
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openVendorBillDialog(vendor.id)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    বিল যোগ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVendorPaymentDialog(vendor.id)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    পেমেন্ট করুন
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openVendorExpenseDialog(vendor.id)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    দৈনিক খরচ
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

        {/* Daily Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="খরচ খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="ক্যাটেগরি" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ক্যাটেগরি</SelectItem>
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
                  <SelectValue placeholder="ভেন্ডর" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব ভেন্ডর</SelectItem>
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
                    এক্সপোর্ট
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    CSV ডাউনলোড
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    Excel ডাউনলোড
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
                    নতুন খরচ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? "খরচ সম্পাদনা" : "নতুন খরচ যোগ করুন"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expense_date">তারিখ</Label>
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
                        <Label htmlFor="expense_amount">টাকা</Label>
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
                      <Label htmlFor="expense_vendor">ভেন্ডর</Label>
                      <Select
                        value={expenseFormData.vendor_id}
                        onValueChange={(value) =>
                          setExpenseFormData({ ...expenseFormData, vendor_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="ভেন্ডর বাছুন (ঐচ্ছিক)" />
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
                      <Label htmlFor="expense_category">ক্যাটেগরি</Label>
                      <Select
                        value={expenseFormData.category_id}
                        onValueChange={(value) =>
                          setExpenseFormData({ ...expenseFormData, category_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="ক্যাটেগরি বাছুন" />
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
                      <Label htmlFor="expense_description">বিবরণ</Label>
                      <Textarea
                        id="expense_description"
                        placeholder="খরচের বিবরণ লিখুন"
                        value={expenseFormData.description}
                        onChange={(e) =>
                          setExpenseFormData({ ...expenseFormData, description: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense_payment_method">পেমেন্ট মেথড</Label>
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
                          <SelectItem value="cash">নগদ</SelectItem>
                          <SelectItem value="bank">ব্যাংক</SelectItem>
                          <SelectItem value="bkash">বিকাশ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsExpenseDialogOpen(false);
                          resetExpenseForm();
                        }}
                      >
                        বাতিল
                      </Button>
                      <Button type="submit">সংরক্ষণ করুন</Button>
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
                  <TableHead>তারিখ</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead>ভেন্ডর</TableHead>
                  <TableHead>ক্যাটেগরি</TableHead>
                  <TableHead>পেমেন্ট</TableHead>
                  <TableHead className="text-right">টাকা</TableHead>
                  {isAdmin && <TableHead className="text-right">অ্যাকশন</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8">
                      লোড হচ্ছে...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      কোনো খরচ পাওয়া যায়নি
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.date), "dd MMM yyyy", { locale: bn })}
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
                      {isAdmin && (
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
              <h2 className="text-lg font-semibold">খরচের ক্যাটেগরি</h2>
              <p className="text-sm text-muted-foreground">খরচের ধরন অনুযায়ী ক্যাটেগরি তৈরি করুন</p>
            </div>
            {isAdmin && (
              <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
                setIsCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন ক্যাটেগরি
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "ক্যাটেগরি সম্পাদনা" : "নতুন ক্যাটেগরি যোগ করুন"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category_name">নাম *</Label>
                      <Input
                        id="category_name"
                        placeholder="ক্যাটেগরির নাম"
                        value={categoryFormData.name}
                        onChange={(e) =>
                          setCategoryFormData({ ...categoryFormData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category_description">বিবরণ</Label>
                      <Textarea
                        id="category_description"
                        placeholder="ক্যাটেগরির বিবরণ"
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
                        onClick={() => {
                          setIsCategoryDialogOpen(false);
                          resetCategoryForm();
                        }}
                      >
                        বাতিল
                      </Button>
                      <Button type="submit">সংরক্ষণ করুন</Button>
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
                লোড হচ্ছে...
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                কোনো ক্যাটেগরি পাওয়া যায়নি
              </div>
            ) : (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCategoryDialog(category)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {category.description || "কোনো বিবরণ নেই"}
                    </p>
                    <div className="mt-3 text-sm">
                      <Badge variant="outline">
                        {expenses.filter(e => e.category_id === category.id).length} টি খরচ
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;
