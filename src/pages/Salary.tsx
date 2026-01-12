import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgScopedQuery } from "@/hooks/useOrgScopedQuery";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
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
import { Plus, Calendar, ShieldAlert, Loader2, Banknote, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { safeParseFloat, parseValidatedFloat } from "@/lib/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AdvanceDeductionDetail {
  advance_id: string;
  amount_deducted: number;
  remaining_after: number;
}

interface SalaryRecord {
  id: string;
  employee_id: string;
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
  advance_deducted_ids: string[] | null;
  advance_deduction_details: unknown;
  employee?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
  basic_salary: number;
}

interface EmployeeAdvance {
  id: string;
  employee_id: string;
  amount: number;
  remaining_balance: number;
  date: string;
  reason: string | null;
  status: string;
  deducted_from_month: number | null;
  deducted_from_year: number | null;
  created_at: string;
  employee?: { full_name: string } | null;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Salary = () => {
  const { isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const { hasPermission } = useOrgRolePermissions();
  
  // Database-driven permission checks
  const canViewSalary = isSuperAdmin || hasPermission('salary.view');
  const canCreateSalary = isSuperAdmin || hasPermission('salary.create');
  const canEditSalary = isSuperAdmin || hasPermission('salary.edit');
  
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("salary");
  
  // Pending advances for selected employee
  const [pendingAdvances, setPendingAdvances] = useState<EmployeeAdvance[]>([]);
  const [autoAdvanceDeduction, setAutoAdvanceDeduction] = useState(0);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: "",
    overtime_hours: "0",
    overtime_amount: "0",
    bonus: "0",
    deductions: "0",
    notes: "",
  });
  const [advanceFormData, setAdvanceFormData] = useState({
    employee_id: "",
    amount: "",
    reason: "",
  });

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, full_name, basic_salary")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("full_name");
      setEmployees(employeesData || []);

      // Fetch salary records
      const { data: salaryData } = await supabase
        .from("employee_salary_records")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .order("created_at", { ascending: false });

      if (salaryData && employeesData) {
        const recordsWithEmployee = salaryData.map((record) => {
          const employee = employeesData.find((e) => e.id === record.employee_id);
          return { ...record, employee: employee ? { full_name: employee.full_name } : null };
        });
        setSalaryRecords(recordsWithEmployee);
      }

      // Fetch advances with remaining_balance
      const { data: advancesData } = await supabase
        .from("employee_advances")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (advancesData && employeesData) {
        const advancesWithEmployee = advancesData.map((advance) => {
          const employee = employeesData.find((e) => e.id === advance.employee_id);
          return { 
            ...advance, 
            remaining_balance: advance.remaining_balance ?? advance.amount,
            employee: employee ? { full_name: employee.full_name } : null 
          };
        });
        setAdvances(advancesWithEmployee);
      }
    } catch (error) {
      console.error("Error fetching salary data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, organizationId]);

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchData();
    }
  }, [fetchData, organizationId, hasOrgContext]);

  // Fetch pending advances when employee is selected
  const fetchPendingAdvances = useCallback(async (employeeId: string) => {
    if (!employeeId || !organizationId) {
      setPendingAdvances([]);
      setAutoAdvanceDeduction(0);
      return;
    }

    const { data } = await supabase
      .from("employee_advances")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .gt("remaining_balance", 0)
      .order("created_at", { ascending: true });

    if (data) {
      setPendingAdvances(data);
      const totalPending = data.reduce((sum, adv) => sum + (adv.remaining_balance ?? adv.amount), 0);
      setAutoAdvanceDeduction(totalPending);
    } else {
      setPendingAdvances([]);
      setAutoAdvanceDeduction(0);
    }
  }, [organizationId]);

  const calculateNetPayable = () => {
    const basic = safeParseFloat(formData.basic_salary, 0, 0, 100000000);
    const overtime = safeParseFloat(formData.overtime_amount, 0, 0, 100000000);
    const bonus = safeParseFloat(formData.bonus, 0, 0, 100000000);
    const deductions = safeParseFloat(formData.deductions, 0, 0, 100000000);
    const grossSalary = basic + overtime + bonus - deductions;
    
    // Auto-calculate advance deduction (capped at gross salary)
    const advanceToDeduct = Math.min(autoAdvanceDeduction, Math.max(0, grossSalary));

    return grossSalary - advanceToDeduct;
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setFormData({
      ...formData,
      employee_id: employeeId,
      basic_salary: employee?.basic_salary?.toString() || "0",
    });
    
    // Fetch pending advances for this employee
    await fetchPendingAdvances(employeeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    setSubmitting(true);

    try {
      // Calculate gross salary
      const basicSalary = safeParseFloat(formData.basic_salary, 0, 0, 100000000);
      const overtimeHours = safeParseFloat(formData.overtime_hours, 0, 0, 1000);
      const overtimeAmount = safeParseFloat(formData.overtime_amount, 0, 0, 100000000);
      const bonus = safeParseFloat(formData.bonus, 0, 0, 100000000);
      const deductions = safeParseFloat(formData.deductions, 0, 0, 100000000);
      const grossSalary = basicSalary + overtimeAmount + bonus - deductions;

      // Fetch FRESH pending advances for this employee (prevent stale data)
      const { data: freshAdvances } = await supabase
        .from("employee_advances")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("employee_id", formData.employee_id)
        .gt("remaining_balance", 0)
        .order("created_at", { ascending: true });

      // Calculate advance deductions
      let remainingGross = grossSalary;
      let totalAdvanceDeducted = 0;
      const advanceDeductionDetails: AdvanceDeductionDetail[] = [];
      const advanceIdsToUpdate: { id: string; newBalance: number; fullySettled: boolean }[] = [];

      if (freshAdvances) {
        for (const adv of freshAdvances) {
          if (remainingGross <= 0) break;
          
          const currentBalance = adv.remaining_balance ?? adv.amount;
          const deductAmount = Math.min(currentBalance, remainingGross);
          const newBalance = currentBalance - deductAmount;
          
          totalAdvanceDeducted += deductAmount;
          remainingGross -= deductAmount;
          
          advanceDeductionDetails.push({
            advance_id: adv.id,
            amount_deducted: deductAmount,
            remaining_after: newBalance,
          });
          
          advanceIdsToUpdate.push({
            id: adv.id,
            newBalance,
            fullySettled: newBalance === 0,
          });
        }
      }

      const netPayable = grossSalary - totalAdvanceDeducted;

      // Insert salary record with advance snapshot
      const salaryInsertData = {
        employee_id: formData.employee_id,
        month: formData.month,
        year: formData.year,
        basic_salary: basicSalary,
        overtime_hours: overtimeHours,
        overtime_amount: overtimeAmount,
        bonus: bonus,
        deductions: deductions,
        advance: totalAdvanceDeducted,
        net_payable: netPayable,
        status: "pending",
        notes: formData.notes || null,
        organization_id: organizationId,
        advance_deducted_ids: advanceIdsToUpdate.length > 0 ? advanceIdsToUpdate.map(a => a.id) : null,
        advance_deduction_details: advanceDeductionDetails.length > 0 ? JSON.stringify(advanceDeductionDetails) : null,
      };
      
      const { error: salaryError } = await supabase
        .from("employee_salary_records")
        .insert(salaryInsertData as any);

      if (salaryError) throw salaryError;

      // Update advance balances in database
      for (const adv of advanceIdsToUpdate) {
        const { error: advError } = await supabase
          .from("employee_advances")
          .update({
            remaining_balance: adv.newBalance,
            status: adv.fullySettled ? "settled" : "partial",
            deducted_from_month: formData.month,
            deducted_from_year: formData.year,
          })
          .eq("id", adv.id);

        if (advError) {
          console.error("Error updating advance:", advError);
        }
      }

      toast.success(`Salary record saved. Advance deducted: ${formatCurrency(totalAdvanceDeducted)}`);
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error saving salary record:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("Salary record already exists for this employee this month");
      } else {
        toast.error("Failed to save salary record");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      basic_salary: "",
      overtime_hours: "0",
      overtime_amount: "0",
      bonus: "0",
      deductions: "0",
      notes: "",
    });
    setPendingAdvances([]);
    setAutoAdvanceDeduction(0);
  };

  const resetAdvanceForm = () => {
    setAdvanceFormData({
      employee_id: "",
      amount: "",
      reason: "",
    });
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!advanceFormData.employee_id || !advanceFormData.amount) {
      toast.error("Please select employee and enter amount");
      return;
    }

    // Validate amount
    let validatedAmount: number;
    try {
      validatedAmount = parseValidatedFloat(advanceFormData.amount, 'Advance amount', 0.01, 100000000);
    } catch (validationError: any) {
      toast.error(validationError.message);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("employee_advances").insert({
        employee_id: advanceFormData.employee_id,
        amount: validatedAmount,
        remaining_balance: validatedAmount, // Initialize remaining_balance = amount
        reason: advanceFormData.reason || null,
        status: "pending",
        organization_id: organizationId,
      });

      if (error) throw error;

      toast.success("Advance recorded. It will be auto-deducted on next salary generation.");
      setIsAdvanceDialogOpen(false);
      resetAdvanceForm();
      fetchData();
    } catch (error) {
      console.error("Error saving advance:", error);
      toast.error("Failed to save advance");
    } finally {
      setSubmitting(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("employee_salary_records")
        .update({
          status: "paid",
          paid_date: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Marked as paid");
      fetchData();
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Update failed");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalPayable = salaryRecords.reduce((sum, r) => sum + r.net_payable, 0);
  const totalPaid = salaryRecords
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.net_payable, 0);
  const totalPendingAdvances = advances
    .filter((a) => (a.remaining_balance ?? a.amount) > 0)
    .reduce((sum, a) => sum + (a.remaining_balance ?? a.amount), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const getAdvanceStatusBadge = (advance: EmployeeAdvance) => {
    const remaining = advance.remaining_balance ?? advance.amount;
    if (remaining === 0) {
      return <Badge variant="default" className="bg-success">Settled</Badge>;
    } else if (remaining < advance.amount) {
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Partial</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message for users without permission
  if (!canViewSalary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Salary</h1>
          <p className="text-muted-foreground mt-1">
            Employee salary management
          </p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center py-10 space-y-4">
              <div className="p-4 rounded-full bg-destructive/10">
                <ShieldAlert className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                <p className="text-muted-foreground max-w-md">
                  You don't have permission to view salary management. 
                  Contact your administrator if you need access.
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
          <h1 className="text-3xl font-bold">Salary</h1>
          <p className="text-muted-foreground">Employee salary management</p>
        </div>
        {(isAdmin || canCreateSalary) && (
          <div className="flex gap-2">
            <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Banknote className="mr-2 h-4 w-4" />
                  Record Advance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Employee Advance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdvanceSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select
                      value={advanceFormData.employee_id}
                      onValueChange={(v) => setAdvanceFormData({ ...advanceFormData, employee_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
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
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={advanceFormData.amount}
                      onChange={(e) => setAdvanceFormData({ ...advanceFormData, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      placeholder="Reason for advance..."
                      value={advanceFormData.reason}
                      onChange={(e) => setAdvanceFormData({ ...advanceFormData, reason: e.target.value })}
                    />
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Auto-Deduction</AlertTitle>
                    <AlertDescription>
                      This advance will be automatically deducted when generating the employee's next salary.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAdvanceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Salary Sheet
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Salary Sheet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={formData.employee_id} onValueChange={handleEmployeeSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
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
                    <Label>Month</Label>
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
                    <Label>Year</Label>
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
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime (Hours)</Label>
                    <Input
                      type="number"
                      value={formData.overtime_hours}
                      onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Overtime (Amount)</Label>
                    <Input
                      type="number"
                      value={formData.overtime_amount}
                      onChange={(e) => setFormData({ ...formData, overtime_amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus</Label>
                    <Input
                      type="number"
                      value={formData.bonus}
                      onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deductions</Label>
                    <Input
                      type="number"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    />
                  </div>
                </div>

                {/* Auto Advance Deduction Display */}
                {pendingAdvances.length > 0 && (
                  <Alert className="border-warning bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-warning">Pending Advances</AlertTitle>
                    <AlertDescription className="text-sm">
                      <div className="mt-2 space-y-1">
                        {pendingAdvances.map((adv) => (
                          <div key={adv.id} className="flex justify-between text-xs">
                            <span>{format(new Date(adv.date), "dd MMM yyyy")}</span>
                            <span className="font-medium">{formatCurrency(adv.remaining_balance ?? adv.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold border-t pt-1 mt-2">
                          <span>Total to Deduct:</span>
                          <span className="text-destructive">{formatCurrency(autoAdvanceDeduction)}</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Salary</span>
                    <span>{formatCurrency(
                      safeParseFloat(formData.basic_salary, 0, 0, 100000000) +
                      safeParseFloat(formData.overtime_amount, 0, 0, 100000000) +
                      safeParseFloat(formData.bonus, 0, 0, 100000000) -
                      safeParseFloat(formData.deductions, 0, 0, 100000000)
                    )}</span>
                  </div>
                  {autoAdvanceDeduction > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Advance Deduction</span>
                      <span>- {formatCurrency(Math.min(autoAdvanceDeduction, Math.max(0,
                        safeParseFloat(formData.basic_salary, 0, 0, 100000000) +
                        safeParseFloat(formData.overtime_amount, 0, 0, 100000000) +
                        safeParseFloat(formData.bonus, 0, 0, 100000000) -
                        safeParseFloat(formData.deductions, 0, 0, 100000000)
                      )))}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Net Payable</span>
                    <span className="text-2xl font-bold">{formatCurrency(calculateNetPayable())}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalPayable)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Pending Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPayable - totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning">Pending Advances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendingAdvances)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="salary">Salary Records</TabsTrigger>
          <TabsTrigger value="advances">Advances</TabsTrigger>
        </TabsList>

        <TabsContent value="salary" className="space-y-4">

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
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Employee</TableHead>
              <TableHead className="text-right whitespace-nowrap">Basic</TableHead>
              <TableHead className="text-right whitespace-nowrap">OT</TableHead>
              <TableHead className="text-right whitespace-nowrap">Bonus</TableHead>
              <TableHead className="text-right whitespace-nowrap">Deductions</TableHead>
              <TableHead className="text-right whitespace-nowrap">Advance</TableHead>
              <TableHead className="text-right whitespace-nowrap">Net Payable</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              {isAdmin && <TableHead className="whitespace-nowrap">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : salaryRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-0">
                  <EmptyState
                    icon={Banknote}
                    title="No salary records"
                    description={`No salary records found for ${months[selectedMonth - 1]} ${selectedYear}`}
                    action={isAdmin ? {
                      label: "Generate Salaries",
                      onClick: () => setIsDialogOpen(true),
                      icon: Plus,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              salaryRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {record.employee?.full_name || "-"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(record.basic_salary)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(record.overtime_amount)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(record.bonus)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(record.deductions)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className={record.advance > 0 ? "text-destructive font-medium" : ""}>
                      {formatCurrency(record.advance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold whitespace-nowrap">
                    {formatCurrency(record.net_payable)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={record.status === "paid" ? "default" : "secondary"}>
                      {record.status === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="whitespace-nowrap">
                      {record.status !== "paid" && (
                        <Button size="sm" onClick={() => markAsPaid(record.id)}>
                          Mark Paid
                        </Button>
                      )}
                      {record.status === "paid" && record.paid_date && (
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.paid_date), "dd MMM")}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
        </TabsContent>

        <TabsContent value="advances" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Deduction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-0">
                      <EmptyState
                        icon={Banknote}
                        title="No advances recorded"
                        description="No salary advances have been recorded yet"
                        action={isAdmin ? {
                          label: "Add Advance",
                          onClick: () => setIsAdvanceDialogOpen(true),
                          icon: Plus,
                        } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>{format(new Date(advance.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium">
                        {advance.employee?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(advance.amount)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span className={(advance.remaining_balance ?? advance.amount) > 0 ? "text-warning" : "text-success"}>
                          {formatCurrency(advance.remaining_balance ?? advance.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="line-clamp-1">{advance.reason || "-"}</p>
                      </TableCell>
                      <TableCell>
                        {getAdvanceStatusBadge(advance)}
                      </TableCell>
                      <TableCell>
                        {advance.deducted_from_month && advance.deducted_from_year ? (
                          <span className="text-sm text-muted-foreground">
                            {months[advance.deducted_from_month - 1]} {advance.deducted_from_year}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Salary;
