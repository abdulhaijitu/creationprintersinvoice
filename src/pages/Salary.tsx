import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Wallet, Calendar, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface SalaryRecord {
  id: string;
  user_id: string;
  month: number;
  year: number;
  basic_salary: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus: number;
  deductions: number;
  advance: number;
  net_payable: number;
  status: string;
  paid_date: string | null;
  notes: string | null;
  profile?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
  basic_salary: number;
}

const months = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

const Salary = () => {
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: "",
    overtime_hours: "0",
    overtime_amount: "0",
    bonus: "0",
    deductions: "0",
    advance: "0",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees if admin
      if (isAdmin) {
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("id, full_name, basic_salary")
          .order("full_name");
        setEmployees(employeesData || []);
      }

      // Fetch salary records
      let query = supabase
        .from("salary_records")
        .select("*")
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      }

      const { data: salaryData } = await query;

      if (salaryData) {
        // Fetch profile names
        const recordsWithProfiles = await Promise.all(
          salaryData.map(async (record) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", record.user_id)
              .single();

            return { ...record, profile };
          })
        );
        setSalaryRecords(recordsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateNetPayable = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const overtime = parseFloat(formData.overtime_amount) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const advance = parseFloat(formData.advance) || 0;

    return basic + overtime + bonus - deductions - advance;
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setFormData({
      ...formData,
      user_id: employeeId,
      basic_salary: employee?.basic_salary?.toString() || "0",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id) {
      toast.error("কর্মচারী বাছুন");
      return;
    }

    try {
      const netPayable = calculateNetPayable();

      const { error } = await supabase.from("salary_records").insert({
        user_id: formData.user_id,
        month: formData.month,
        year: formData.year,
        basic_salary: parseFloat(formData.basic_salary) || 0,
        overtime_hours: parseFloat(formData.overtime_hours) || 0,
        overtime_amount: parseFloat(formData.overtime_amount) || 0,
        bonus: parseFloat(formData.bonus) || 0,
        deductions: parseFloat(formData.deductions) || 0,
        advance: parseFloat(formData.advance) || 0,
        net_payable: netPayable,
        status: "pending",
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("বেতন রেকর্ড সংরক্ষণ হয়েছে");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving salary record:", error);
      toast.error("বেতন রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basic_salary: "",
      overtime_hours: "0",
      overtime_amount: "0",
      bonus: "0",
      deductions: "0",
      advance: "0",
      notes: "",
    });
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("salary_records")
        .update({
          status: "paid",
          paid_date: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("বেতন পরিশোধিত হিসেবে চিহ্নিত হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("আপডেট ব্যর্থ হয়েছে");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPayable = salaryRecords.reduce((sum, r) => sum + r.net_payable, 0);
  const totalPaid = salaryRecords
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.net_payable, 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">বেতন</h1>
          <p className="text-muted-foreground mt-1">
            কর্মচারী বেতন ব্যবস্থাপনা
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">অ্যাক্সেস নেই</h2>
                <p className="text-muted-foreground max-w-md">
                  শুধুমাত্র অ্যাডমিন ব্যবহারকারীরা বেতন ব্যবস্থাপনা দেখতে পারেন। 
                  আপনার অ্যাডমিন অ্যাক্সেস প্রয়োজন হলে আপনার সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">বেতন</h1>
          <p className="text-muted-foreground">কর্মচারী বেতন ব্যবস্থাপনা</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                নতুন বেতন শীট
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>নতুন বেতন শীট তৈরি</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>কর্মচারী</Label>
                  <Select value={formData.user_id} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="কর্মচারী বাছুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>মাস</Label>
                    <Select
                      value={formData.month.toString()}
                      onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>বছর</Label>
                    <Select
                      value={formData.year.toString()}
                      onValueChange={(v) => setFormData({ ...formData, year: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>মূল বেতন</Label>
                    <Input
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ওভারটাইম (ঘণ্টা)</Label>
                    <Input
                      type="number"
                      value={formData.overtime_hours}
                      onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>ওভারটাইম (টাকা)</Label>
                    <Input
                      type="number"
                      value={formData.overtime_amount}
                      onChange={(e) => setFormData({ ...formData, overtime_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>বোনাস</Label>
                    <Input
                      type="number"
                      value={formData.bonus}
                      onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>কর্তন</Label>
                    <Input
                      type="number"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>অগ্রিম কর্তন</Label>
                  <Input
                    type="number"
                    value={formData.advance}
                    onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>নোট</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">নেট প্রদেয়</p>
                  <p className="text-2xl font-bold">{formatCurrency(calculateNetPayable())}</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit">সংরক্ষণ</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              মোট প্রদেয়
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">পরিশোধিত</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">বাকি</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPayable - totalPaid)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Salary Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>কর্মচারী</TableHead>
              <TableHead className="text-right">মূল বেতন</TableHead>
              <TableHead className="text-right">ওভারটাইম</TableHead>
              <TableHead className="text-right">বোনাস</TableHead>
              <TableHead className="text-right">কর্তন</TableHead>
              <TableHead className="text-right">নেট প্রদেয়</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              {isAdmin && <TableHead className="text-center">অ্যাকশন</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : salaryRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  কোনো রেকর্ড পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              salaryRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.profile?.full_name || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(record.basic_salary)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(record.overtime_amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(record.bonus)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    -{formatCurrency(record.deductions + record.advance)}
                  </TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(record.net_payable)}</TableCell>
                  <TableCell>
                    {record.status === "paid" ? (
                      <Badge className="bg-success">পরিশোধিত</Badge>
                    ) : (
                      <Badge variant="secondary">বাকি</Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      {record.status !== "paid" && (
                        <Button variant="outline" size="sm" onClick={() => markAsPaid(record.id)}>
                          পরিশোধ
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Salary;
