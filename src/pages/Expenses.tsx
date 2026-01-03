import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, Wallet, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

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
}

interface Vendor {
  id: string;
  name: string;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    payment_method: "cash",
    category_id: "",
    vendor_id: "",
  });

  useEffect(() => {
    fetchData();
  }, [filterCategory, filterMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name");
      setCategories(categoriesData || []);

      // Fetch vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("id, name")
        .order("name");
      setVendors(vendorsData || []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || !formData.amount) {
      toast.error("বিবরণ এবং টাকার পরিমাণ দিন");
      return;
    }

    try {
      const { error } = await supabase.from("expenses").insert({
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        category_id: formData.category_id || null,
        vendor_id: formData.vendor_id || null,
      });

      if (error) throw error;

      toast.success("খরচ সংরক্ষণ হয়েছে");
      setIsDialogOpen(false);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        amount: "",
        payment_method: "cash",
        category_id: "",
        vendor_id: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("খরচ সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">দৈনিক খরচ</h1>
          <p className="text-muted-foreground">সব খরচের হিসাব রাখুন</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              নতুন খরচ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>নতুন খরচ যোগ করুন</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">তারিখ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">টাকা</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">ক্যাটেগরি</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: value })
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
                <Label htmlFor="description">বিবরণ</Label>
                <Textarea
                  id="description"
                  placeholder="খরচের বিবরণ লিখুন"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">পেমেন্ট মেথড</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value })
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
                  <Label htmlFor="vendor">ভেন্ডর (ঐচ্ছিক)</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, vendor_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="বাছুন" />
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
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  বাতিল
                </Button>
                <Button type="submit">সংরক্ষণ করুন</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-lg p-6 border border-destructive/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-destructive/20 rounded-full">
            <Wallet className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">মোট খরচ (ফিল্টার অনুযায়ী)</p>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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

      {/* Expenses Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>তারিখ</TableHead>
              <TableHead>বিবরণ</TableHead>
              <TableHead>ক্যাটেগরি</TableHead>
              <TableHead>ভেন্ডর</TableHead>
              <TableHead>পেমেন্ট</TableHead>
              <TableHead className="text-right">টাকা</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    {expense.category?.name ? (
                      <Badge variant="secondary">{expense.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.vendor?.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>{getPaymentMethodBadge(expense.payment_method || "cash")}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Expenses;
