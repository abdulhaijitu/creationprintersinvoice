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
import { Plus, Calendar, ShieldAlert, Loader2, Banknote, AlertTriangle, Pencil, Trash2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
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
  deduct_month: string | null; // YYYY-MM format - when to start deducting
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
  
  // Edit/Delete state for salary records
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
  const [deletingSalary, setDeletingSalary] = useState<SalaryRecord | null>(null);
  const [deletingAdvance, setDeletingAdvance] = useState<EmployeeAdvance | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<EmployeeAdvance | null>(null);
  
  // Edit form for salary (excludes employee_id and month/year)
  const [editSalaryForm, setEditSalaryForm] = useState({
    basic_salary: "",
    bonus: "0",
    deductions: "0",
    notes: "",
  });
  
  // Edit form for advance
  const [editAdvanceForm, setEditAdvanceForm] = useState({
    amount: "",
    deduct_month: "",
    reason: "",
  });
  
  // Pending advances for selected employee
  const [pendingAdvances, setPendingAdvances] = useState<EmployeeAdvance[]>([]);
  const [autoAdvanceDeduction, setAutoAdvanceDeduction] = useState(0);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basic_salary: "",
    bonus: "0",
    deductions: "0",
    notes: "",
  });
  const [advanceFormData, setAdvanceFormData] = useState({
    employee_id: "",
    entry_date: new Date(), // Entry date for record/reporting
    amount: "",
    payment_method: "cash", // Default payment method
    reason: "",
    deduct_month: format(new Date(), "yyyy-MM"), // Default to current month
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

  // Fetch pending advances when employee is selected (for the selected salary month)
  const fetchPendingAdvances = useCallback(async (employeeId: string, salaryMonth?: number, salaryYear?: number) => {
    if (!employeeId || !organizationId) {
      setPendingAdvances([]);
      setAutoAdvanceDeduction(0);
      return;
    }

    const month = salaryMonth ?? formData.month;
    const year = salaryYear ?? formData.year;
    const salaryMonthStr = `${year}-${String(month).padStart(2, '0')}`;

    const { data } = await supabase
      .from("employee_advances")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("employee_id", employeeId)
      .eq("status", "active")
      .gt("remaining_balance", 0)
      .eq("deduct_month", salaryMonthStr) // Only advances where deduct_month == salary month (exact match)
      .order("created_at", { ascending: true });

    if (data) {
      setPendingAdvances(data);
      const totalPending = data.reduce((sum, adv) => sum + (adv.remaining_balance ?? adv.amount), 0);
      setAutoAdvanceDeduction(totalPending);
    } else {
      setPendingAdvances([]);
      setAutoAdvanceDeduction(0);
    }
  }, [organizationId, formData.month, formData.year]);

  const calculateNetPayable = () => {
    const basic = safeParseFloat(formData.basic_salary, 0, 0, 100000000);
    const bonus = safeParseFloat(formData.bonus, 0, 0, 100000000);
    const deductions = safeParseFloat(formData.deductions, 0, 0, 100000000);
    // Formula: (Basic + Bonus) - (Deductions + Advance)
    const grossSalary = basic + bonus;
    const advanceToDeduct = Math.min(autoAdvanceDeduction, Math.max(0, grossSalary - deductions));

    return grossSalary - deductions - advanceToDeduct;
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    setFormData({
      ...formData,
      employee_id: employeeId,
      basic_salary: employee?.basic_salary?.toString() || "0",
    });
    
    // Fetch pending advances for this employee (for the selected salary month)
    await fetchPendingAdvances(employeeId, formData.month, formData.year);
  };

  // Re-fetch pending advances when salary month/year changes
  const handleMonthChange = async (month: number) => {
    setFormData({ ...formData, month });
    if (formData.employee_id) {
      await fetchPendingAdvances(formData.employee_id, month, formData.year);
    }
  };

  const handleYearChange = async (year: number) => {
    setFormData({ ...formData, year });
    if (formData.employee_id) {
      await fetchPendingAdvances(formData.employee_id, formData.month, year);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    setSubmitting(true);

    try {
      // Calculate salary: (Basic + Bonus) - (Deductions + Advance)
      const basicSalary = safeParseFloat(formData.basic_salary, 0, 0, 100000000);
      const bonus = safeParseFloat(formData.bonus, 0, 0, 100000000);
      const deductions = safeParseFloat(formData.deductions, 0, 0, 100000000);
      const grossSalary = basicSalary + bonus;

      // Fetch FRESH pending advances for this employee (for the target salary month)
      const salaryMonthStr = `${formData.year}-${String(formData.month).padStart(2, '0')}`;
      
      const { data: freshAdvances } = await supabase
        .from("employee_advances")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("employee_id", formData.employee_id)
        .eq("status", "active")
        .gt("remaining_balance", 0)
        .eq("deduct_month", salaryMonthStr) // Only advances where deduct_month == salary month (exact match)
        .order("created_at", { ascending: true });

      // Calculate advance deductions: max deductible = grossSalary - deductions
      let remainingForAdvance = grossSalary - deductions;
      let totalAdvanceDeducted = 0;
      const advanceDeductionDetails: AdvanceDeductionDetail[] = [];
      const advanceIdsToUpdate: { id: string; newBalance: number; fullySettled: boolean }[] = [];

      if (freshAdvances) {
        for (const adv of freshAdvances) {
          if (remainingForAdvance <= 0) break;
          
          const currentBalance = adv.remaining_balance ?? adv.amount;
          const deductAmount = Math.min(currentBalance, remainingForAdvance);
          const newBalance = currentBalance - deductAmount;
          
          totalAdvanceDeducted += deductAmount;
          remainingForAdvance -= deductAmount;
          
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

      // Net Payable = (Basic + Bonus) - (Deductions + Advance)
      const netPayable = grossSalary - deductions - totalAdvanceDeducted;

      // Insert salary record with advance snapshot
      const salaryInsertData = {
        employee_id: formData.employee_id,
        month: formData.month,
        year: formData.year,
        basic_salary: basicSalary,
        overtime_hours: 0,
        overtime_amount: 0,
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
            status: adv.fullySettled ? "settled" : "active",
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
      entry_date: new Date(),
      amount: "",
      payment_method: "cash",
      reason: "",
      deduct_month: format(new Date(), "yyyy-MM"),
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
      // Insert the advance record
      const { data: newAdvance, error } = await supabase.from("employee_advances").insert({
        employee_id: advanceFormData.employee_id,
        amount: validatedAmount,
        remaining_balance: validatedAmount,
        date: format(advanceFormData.entry_date, "yyyy-MM-dd"), // Entry date for record/reporting
        payment_method: advanceFormData.payment_method,
        reason: advanceFormData.reason || null,
        deduct_month: advanceFormData.deduct_month,
        status: "active",
        organization_id: organizationId,
      }).select().single();

      if (error) throw error;

      // AUTO-SYNC: Check if a salary record already exists for this employee + deduct_month
      const [deductYear, deductMonthNum] = advanceFormData.deduct_month.split('-').map(Number);
      
      const { data: existingSalary } = await supabase
        .from("employee_salary_records")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("employee_id", advanceFormData.employee_id)
        .eq("year", deductYear)
        .eq("month", deductMonthNum)
        .maybeSingle();

      if (existingSalary) {
        // Check if salary is already paid - block auto-sync if paid
        if (existingSalary.status === "paid") {
          toast.warning("Advance created but salary for that month is already paid. Manual adjustment may be needed.");
        } else {
          // Recalculate and update the salary record
          const currentAdvance = existingSalary.advance || 0;
          const newTotalAdvance = currentAdvance + validatedAmount;
          
          // Net Payable = (Basic + Bonus) - (Deductions + Advance)
          const grossSalary = (existingSalary.basic_salary || 0) + (existingSalary.bonus || 0);
          const newNetPayable = grossSalary - (existingSalary.deductions || 0) - newTotalAdvance;

          // Parse existing advance_deduction_details
          let existingDetails: AdvanceDeductionDetail[] = [];
          if (existingSalary.advance_deduction_details) {
            try {
              if (typeof existingSalary.advance_deduction_details === 'string') {
                existingDetails = JSON.parse(existingSalary.advance_deduction_details);
              } else if (Array.isArray(existingSalary.advance_deduction_details)) {
                existingDetails = existingSalary.advance_deduction_details as unknown as AdvanceDeductionDetail[];
              }
            } catch {
              console.error("Failed to parse existing advance_deduction_details");
            }
          }

          // Add new advance to deduction details
          const newDetail: AdvanceDeductionDetail = {
            advance_id: newAdvance.id,
            amount_deducted: validatedAmount,
            remaining_after: 0,
          };
          const updatedDetails = [...existingDetails, newDetail];

          // Update existing advance_deducted_ids
          const existingIds = existingSalary.advance_deducted_ids || [];
          const updatedIds = [...existingIds, newAdvance.id];

          // Update salary record
          const { error: salaryUpdateError } = await supabase
            .from("employee_salary_records")
            .update({
              advance: newTotalAdvance,
              net_payable: newNetPayable,
              advance_deducted_ids: updatedIds,
              advance_deduction_details: JSON.stringify(updatedDetails),
            })
            .eq("id", existingSalary.id);

          if (salaryUpdateError) {
            console.error("Error updating salary:", salaryUpdateError);
            toast.error("Advance created but failed to sync with existing salary record.");
          } else {
            // Mark the advance as settled since it's been deducted
            await supabase
              .from("employee_advances")
              .update({
                remaining_balance: 0,
                status: "settled",
                deducted_from_month: deductMonthNum,
                deducted_from_year: deductYear,
              })
              .eq("id", newAdvance.id);

            toast.success(`Advance created and auto-synced with existing salary. Net payable reduced by ${formatCurrency(validatedAmount)}`);
            setIsAdvanceDialogOpen(false);
            resetAdvanceForm();
            fetchData();
            return;
          }
        }
      }

      toast.success("Advance recorded. It will be auto-deducted when salary is generated.");
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

  // Open edit dialog for salary record
  const openEditSalary = (record: SalaryRecord) => {
    setEditingSalary(record);
    setEditSalaryForm({
      basic_salary: record.basic_salary.toString(),
      bonus: record.bonus?.toString() || "0",
      deductions: record.deductions?.toString() || "0",
      notes: record.notes || "",
    });
  };

  // Calculate net payable for edit form (advance stays unchanged)
  // Formula: (Basic + Bonus) - (Deductions + Advance)
  const calculateEditNetPayable = () => {
    if (!editingSalary) return 0;
    const basic = safeParseFloat(editSalaryForm.basic_salary, 0, 0, 100000000);
    const bonus = safeParseFloat(editSalaryForm.bonus, 0, 0, 100000000);
    const deductions = safeParseFloat(editSalaryForm.deductions, 0, 0, 100000000);
    const grossSalary = basic + bonus;
    // Net = (Basic + Bonus) - (Deductions + Advance)
    return grossSalary - deductions - (editingSalary.advance || 0);
  };

  // Handle edit salary submission
  const handleEditSalary = async () => {
    if (!editingSalary) return;

    setSubmitting(true);
    try {
      const basicSalary = safeParseFloat(editSalaryForm.basic_salary, 0, 0, 100000000);
      const bonus = safeParseFloat(editSalaryForm.bonus, 0, 0, 100000000);
      const deductions = safeParseFloat(editSalaryForm.deductions, 0, 0, 100000000);
      
      // Net = (Basic + Bonus) - (Deductions + Advance)
      const grossSalary = basicSalary + bonus;
      const netPayable = grossSalary - deductions - (editingSalary.advance || 0);
      
      if (netPayable < 0) {
        toast.error("Net payable cannot be negative. Adjust deductions or advance.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("employee_salary_records")
        .update({
          basic_salary: basicSalary,
          bonus: bonus,
          deductions: deductions,
          net_payable: netPayable,
          notes: editSalaryForm.notes || null,
        })
        .eq("id", editingSalary.id);

      if (error) throw error;

      toast.success("Salary record updated successfully");
      setEditingSalary(null);
      fetchData();
    } catch (error) {
      console.error("Error updating salary:", error);
      toast.error("Failed to update salary record");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete salary with advance reversal
  const handleDeleteSalary = async () => {
    if (!deletingSalary) return;

    setSubmitting(true);
    try {
      // If there's advance deducted, we need to reverse it
      if (deletingSalary.advance > 0 && deletingSalary.advance_deduction_details) {
        let deductionDetails: AdvanceDeductionDetail[] = [];
        
        try {
          if (typeof deletingSalary.advance_deduction_details === 'string') {
            deductionDetails = JSON.parse(deletingSalary.advance_deduction_details);
          } else if (Array.isArray(deletingSalary.advance_deduction_details)) {
            deductionDetails = deletingSalary.advance_deduction_details as unknown as AdvanceDeductionDetail[];
          }
        } catch {
          console.error("Failed to parse advance_deduction_details");
        }

        // Reverse each advance deduction
        for (const detail of deductionDetails) {
          // Get current advance state
          const { data: advanceData } = await supabase
            .from("employee_advances")
            .select("*")
            .eq("id", detail.advance_id)
            .single();

          if (advanceData) {
            // Add back the deducted amount
            const newBalance = (advanceData.remaining_balance ?? 0) + detail.amount_deducted;
            
            await supabase
              .from("employee_advances")
              .update({
                remaining_balance: newBalance,
                status: "active", // Reactivate the advance
              })
              .eq("id", detail.advance_id);
          }
        }
      }

      // Now delete the salary record
      const { error } = await supabase
        .from("employee_salary_records")
        .delete()
        .eq("id", deletingSalary.id);

      if (error) throw error;

      toast.success(
        deletingSalary.advance > 0
          ? `Salary deleted. ${formatCurrency(deletingSalary.advance)} advance restored to balance.`
          : "Salary record deleted"
      );
      setDeletingSalary(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting salary:", error);
      toast.error("Failed to delete salary record");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if advance can be edited - now allowed even if settled, but blocked if salary is paid
  const canEditAdvance = async (advance: EmployeeAdvance): Promise<{ allowed: boolean; reason?: string; salaryPaid?: boolean }> => {
    // If never deducted, always allow
    if (advance.remaining_balance === advance.amount) {
      return { allowed: true };
    }
    
    // Check if related salary is marked as paid
    if (advance.deducted_from_month && advance.deducted_from_year) {
      const { data: salaryRecord } = await supabase
        .from("employee_salary_records")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("employee_id", advance.employee_id)
        .eq("month", advance.deducted_from_month)
        .eq("year", advance.deducted_from_year)
        .single();
      
      if (salaryRecord?.status === "paid") {
        return { allowed: false, reason: "Cannot edit - related salary is marked as Paid", salaryPaid: true };
      }
    }
    
    return { allowed: true };
  };

  // Check if advance can be deleted - now allowed even if settled, but blocked if salary is paid
  const canDeleteAdvance = async (advance: EmployeeAdvance): Promise<{ allowed: boolean; reason?: string; salaryPaid?: boolean }> => {
    // If never deducted, always allow
    if (advance.remaining_balance === advance.amount) {
      return { allowed: true };
    }
    
    // Check if related salary is marked as paid
    if (advance.deducted_from_month && advance.deducted_from_year) {
      const { data: salaryRecord } = await supabase
        .from("employee_salary_records")
        .select("id, status")
        .eq("organization_id", organizationId)
        .eq("employee_id", advance.employee_id)
        .eq("month", advance.deducted_from_month)
        .eq("year", advance.deducted_from_year)
        .single();
      
      if (salaryRecord?.status === "paid") {
        return { allowed: false, reason: "Cannot delete - related salary is marked as Paid", salaryPaid: true };
      }
    }
    
    return { allowed: true };
  };

  // Open edit dialog for advance
  const openEditAdvance = async (advance: EmployeeAdvance) => {
    const checkResult = await canEditAdvance(advance);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason || "Cannot edit this advance");
      return;
    }
    setEditingAdvance(advance);
    setEditAdvanceForm({
      amount: advance.amount.toString(),
      deduct_month: advance.deduct_month || format(new Date(), "yyyy-MM"),
      reason: advance.reason || "",
    });
  };

  // Handle edit advance submission (with salary rollback for settled advances)
  const handleEditAdvance = async () => {
    if (!editingAdvance) return;

    // Validate amount
    let validatedAmount: number;
    try {
      validatedAmount = parseValidatedFloat(editAdvanceForm.amount, 'Advance amount', 0.01, 100000000);
    } catch (validationError: any) {
      toast.error(validationError.message);
      return;
    }

    setSubmitting(true);
    try {
      const wasDeducted = editingAdvance.remaining_balance !== editingAdvance.amount;
      const oldDeductedAmount = editingAdvance.amount - (editingAdvance.remaining_balance ?? editingAdvance.amount);
      
      // If advance was already deducted, we need to update the related salary record
      if (wasDeducted && editingAdvance.deducted_from_month && editingAdvance.deducted_from_year) {
        // Find the related salary record
        const { data: salaryRecord } = await supabase
          .from("employee_salary_records")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("employee_id", editingAdvance.employee_id)
          .eq("month", editingAdvance.deducted_from_month)
          .eq("year", editingAdvance.deducted_from_year)
          .single();

        if (salaryRecord) {
          // Calculate new deduction amount (cap at gross - deductions)
          const grossSalary = salaryRecord.basic_salary + salaryRecord.bonus;
          const maxDeductible = Math.max(0, grossSalary - salaryRecord.deductions);
          const newDeductedAmount = Math.min(validatedAmount, maxDeductible);
          const newRemainingBalance = validatedAmount - newDeductedAmount;
          
          // Update salary record: remove old advance, apply new
          const advanceDiff = newDeductedAmount - oldDeductedAmount;
          const newAdvanceTotal = (salaryRecord.advance || 0) + advanceDiff;
          const newNetPayable = grossSalary - salaryRecord.deductions - newAdvanceTotal;
          
          // Update advance_deduction_details
          let deductionDetails: AdvanceDeductionDetail[] = [];
          try {
            if (salaryRecord.advance_deduction_details) {
              if (typeof salaryRecord.advance_deduction_details === 'string') {
                deductionDetails = JSON.parse(salaryRecord.advance_deduction_details);
              } else if (Array.isArray(salaryRecord.advance_deduction_details)) {
                deductionDetails = salaryRecord.advance_deduction_details as unknown as AdvanceDeductionDetail[];
              }
            }
          } catch {
            deductionDetails = [];
          }
          
          // Update the specific advance entry in details
          const detailIndex = deductionDetails.findIndex(d => d.advance_id === editingAdvance.id);
          if (detailIndex >= 0) {
            deductionDetails[detailIndex] = {
              advance_id: editingAdvance.id,
              amount_deducted: newDeductedAmount,
              remaining_after: newRemainingBalance,
            };
          }
          
          // Update salary record
          const { error: salaryError } = await supabase
            .from("employee_salary_records")
            .update({
              advance: newAdvanceTotal,
              net_payable: newNetPayable,
              advance_deduction_details: JSON.stringify(deductionDetails),
            })
            .eq("id", salaryRecord.id);
          
          if (salaryError) throw salaryError;
          
          // Update advance record
          const { error: advanceError } = await supabase
            .from("employee_advances")
            .update({
              amount: validatedAmount,
              remaining_balance: newRemainingBalance,
              deduct_month: editAdvanceForm.deduct_month,
              reason: editAdvanceForm.reason || null,
              status: newRemainingBalance === 0 ? "settled" : "active",
            })
            .eq("id", editingAdvance.id);
          
          if (advanceError) throw advanceError;
          
          toast.success(`Advance updated. Salary recalculated: ${formatCurrency(newNetPayable)} net payable.`);
        }
      } else {
        // Never deducted - simple update
        const { error } = await supabase
          .from("employee_advances")
          .update({
            amount: validatedAmount,
            remaining_balance: validatedAmount,
            deduct_month: editAdvanceForm.deduct_month,
            reason: editAdvanceForm.reason || null,
          })
          .eq("id", editingAdvance.id);

        if (error) throw error;
        toast.success("Advance updated successfully");
      }
      
      setEditingAdvance(null);
      fetchData();
    } catch (error) {
      console.error("Error updating advance:", error);
      toast.error("Failed to update advance");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete advance (with salary rollback for settled advances)
  const handleDeleteAdvance = async () => {
    if (!deletingAdvance) return;

    // Check if salary is paid
    const checkResult = await canDeleteAdvance(deletingAdvance);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason || "Cannot delete this advance");
      setDeletingAdvance(null);
      return;
    }

    setSubmitting(true);
    try {
      const wasDeducted = deletingAdvance.remaining_balance !== deletingAdvance.amount;
      const deductedAmount = deletingAdvance.amount - (deletingAdvance.remaining_balance ?? deletingAdvance.amount);
      
      // If advance was already deducted, we need to roll back the salary record
      if (wasDeducted && deletingAdvance.deducted_from_month && deletingAdvance.deducted_from_year) {
        // Find the related salary record
        const { data: salaryRecord } = await supabase
          .from("employee_salary_records")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("employee_id", deletingAdvance.employee_id)
          .eq("month", deletingAdvance.deducted_from_month)
          .eq("year", deletingAdvance.deducted_from_year)
          .single();

        if (salaryRecord) {
          // Roll back: remove the advance deduction from salary
          const newAdvanceTotal = Math.max(0, (salaryRecord.advance || 0) - deductedAmount);
          const grossSalary = salaryRecord.basic_salary + salaryRecord.bonus;
          const newNetPayable = grossSalary - salaryRecord.deductions - newAdvanceTotal;
          
          // Update advance_deduction_details - remove this advance
          let deductionDetails: AdvanceDeductionDetail[] = [];
          try {
            if (salaryRecord.advance_deduction_details) {
              if (typeof salaryRecord.advance_deduction_details === 'string') {
                deductionDetails = JSON.parse(salaryRecord.advance_deduction_details);
              } else if (Array.isArray(salaryRecord.advance_deduction_details)) {
                deductionDetails = salaryRecord.advance_deduction_details as unknown as AdvanceDeductionDetail[];
              }
            }
          } catch {
            deductionDetails = [];
          }
          
          // Remove the advance entry from details
          deductionDetails = deductionDetails.filter(d => d.advance_id !== deletingAdvance.id);
          
          // Update advance_deducted_ids
          const advanceIds = salaryRecord.advance_deducted_ids?.filter(id => id !== deletingAdvance.id) || null;
          
          // Update salary record
          const { error: salaryError } = await supabase
            .from("employee_salary_records")
            .update({
              advance: newAdvanceTotal,
              net_payable: newNetPayable,
              advance_deduction_details: deductionDetails.length > 0 ? JSON.stringify(deductionDetails) : null,
              advance_deducted_ids: advanceIds && advanceIds.length > 0 ? advanceIds : null,
            })
            .eq("id", salaryRecord.id);
          
          if (salaryError) throw salaryError;
          
          toast.success(`Advance deleted. Salary updated: ${formatCurrency(deductedAmount)} restored to net payable.`);
        }
      }
      
      // Delete the advance record
      const { error } = await supabase
        .from("employee_advances")
        .delete()
        .eq("id", deletingAdvance.id);

      if (error) throw error;

      if (!wasDeducted) {
        toast.success("Advance deleted successfully");
      }
      
      setDeletingAdvance(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting advance:", error);
      toast.error("Failed to delete advance");
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

  // Calculate summary metrics
  // Gross salary = Basic + Bonus (before deductions and advance)
  const totalGrossSalary = salaryRecords.reduce((sum, r) => 
    sum + r.basic_salary + r.bonus, 0);
  
  // Total deductions
  const totalDeductions = salaryRecords.reduce((sum, r) => sum + r.deductions, 0);
  
  // Total advances deducted from salaries this month
  const totalAdvanceDeducted = salaryRecords.reduce((sum, r) => sum + (r.advance || 0), 0);
  
  // Net payable = (Basic + Bonus) - (Deductions + Advance)
  const totalNetPayable = salaryRecords.reduce((sum, r) => sum + r.net_payable, 0);
  
  // Salary payments marked as paid
  const totalSalaryPaid = salaryRecords
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.net_payable, 0);
  
  // Pending salary = net payable that hasn't been paid yet
  const totalPendingSalary = totalNetPayable - totalSalaryPaid;
  
  // Pending advances = advances not yet recovered from salary
  const totalPendingAdvances = advances
    .filter((a) => (a.remaining_balance ?? a.amount) > 0)
    .reduce((sum, a) => sum + (a.remaining_balance ?? a.amount), 0);
  
  // Total advances given out (for reference)
  const totalAdvancesGiven = advances.reduce((sum, a) => sum + a.amount, 0);
  const totalAdvancesRecovered = advances.reduce((sum, a) => sum + (a.amount - (a.remaining_balance ?? a.amount)), 0);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const getAdvanceStatusBadge = (advance: EmployeeAdvance) => {
    const remaining = advance.remaining_balance ?? advance.amount;
    if (remaining === 0 || advance.status === "settled") {
      return <Badge variant="default" className="bg-success">Settled</Badge>;
    }
    // Active means pending deduction in the specified deduct_month
    return <Badge variant="outline">Active</Badge>;
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
                    <Label>Entry Date</Label>
                    <DatePicker
                      value={advanceFormData.entry_date}
                      onChange={(date) => date && setAdvanceFormData({ ...advanceFormData, entry_date: date })}
                      placeholder="Select entry date"
                      helperText="Entry date is for record and reporting purposes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>Payment Method</Label>
                      <Select
                        value={advanceFormData.payment_method}
                        onValueChange={(v) => setAdvanceFormData({ ...advanceFormData, payment_method: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bkash">bKash</SelectItem>
                          <SelectItem value="nagad">Nagad</SelectItem>
                          <SelectItem value="rocket">Rocket</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Deduct From Month</Label>
                    <Input
                      type="month"
                      value={advanceFormData.deduct_month}
                      onChange={(e) => setAdvanceFormData({ ...advanceFormData, deduct_month: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Advance will be deducted ONLY when salary is generated for this exact month
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (Optional)</Label>
                    <Textarea
                      placeholder="Reason for advance..."
                      value={advanceFormData.reason}
                      onChange={(e) => setAdvanceFormData({ ...advanceFormData, reason: e.target.value })}
                    />
                  </div>
                  <Alert className="border-primary/50 bg-primary/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Auto-Deduction</AlertTitle>
                    <AlertDescription>
                      This advance will be automatically deducted ONLY when generating salary for {advanceFormData.deduct_month}.
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
                      onValueChange={(v) => handleMonthChange(parseInt(v))}
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
                      onValueChange={(v) => handleYearChange(parseInt(v))}
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

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={formData.basic_salary}
                      onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
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
                            <span>
                              {format(new Date(adv.date), "dd MMM yyyy")}
                              {adv.deduct_month && (
                                <span className="ml-1 text-muted-foreground">(from {adv.deduct_month})</span>
                              )}
                            </span>
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
                    <span className="text-muted-foreground">Basic + Bonus</span>
                    <span>{formatCurrency(
                      safeParseFloat(formData.basic_salary, 0, 0, 100000000) +
                      safeParseFloat(formData.bonus, 0, 0, 100000000)
                    )}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Deductions</span>
                    <span>- {formatCurrency(safeParseFloat(formData.deductions, 0, 0, 100000000))}</span>
                  </div>
                  {autoAdvanceDeduction > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Advance Deduction</span>
                      <span>- {formatCurrency(Math.min(autoAdvanceDeduction, Math.max(0,
                        safeParseFloat(formData.basic_salary, 0, 0, 100000000) +
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

      {/* Summary Cards - Redesigned for clarity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Gross Salary (Basic + Bonus) */}
        <Card className="border-l-4 border-l-muted-foreground/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Basic + Bonus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">{formatCurrency(totalGrossSalary)}</p>
            {(totalDeductions > 0 || totalAdvanceDeducted > 0) && (
              <p className="text-xs text-muted-foreground">
                - {formatCurrency(totalDeductions + totalAdvanceDeducted)} (ded+adv) = {formatCurrency(totalNetPayable)} net
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Card 2: Salary Paid */}
        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">Salary Paid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-success">{formatCurrency(totalSalaryPaid)}</p>
            {totalAdvancesRecovered > 0 && (
              <p className="text-xs text-muted-foreground">
                + {formatCurrency(totalAdvancesRecovered)} advance recovered
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Card 3: Pending Salary */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Pending Salary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPendingSalary)}
            </p>
            <p className="text-xs text-muted-foreground">
              {salaryRecords.filter(r => r.status !== "paid").length} unpaid records
            </p>
          </CardContent>
        </Card>
        
        {/* Card 4: Advances Status */}
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning">Advances Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-warning">{formatCurrency(totalPendingAdvances)}</p>
            {totalAdvancesGiven > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalAdvancesRecovered)} of {formatCurrency(totalAdvancesGiven)} recovered
              </p>
            )}
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
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : salaryRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-0">
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
                    {formatCurrency(record.bonus)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(record.deductions)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={record.advance > 0 ? "text-destructive font-medium" : ""}>
                        {formatCurrency(record.advance)}
                      </span>
                      {record.advance > 0 && record.advance_deduction_details && (() => {
                        // Check if any advance was auto-synced (created after salary record)
                        try {
                          let details: AdvanceDeductionDetail[] = [];
                          if (typeof record.advance_deduction_details === 'string') {
                            details = JSON.parse(record.advance_deduction_details);
                          } else if (Array.isArray(record.advance_deduction_details)) {
                            details = record.advance_deduction_details as unknown as AdvanceDeductionDetail[];
                          }
                          // Check if record was updated after creation (indicates auto-sync)
                          const advanceIds = record.advance_deducted_ids || [];
                          const hasMultipleAdvances = advanceIds.length > 1 || details.length > 0;
                          if (hasMultipleAdvances) {
                            return (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 border-primary/50 text-primary">
                                <RefreshCw className="h-3 w-3" />
                                Synced
                              </Badge>
                            );
                          }
                        } catch {
                          return null;
                        }
                        return null;
                      })()}
                    </div>
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
                      <div className="flex items-center gap-1">
                        {record.status !== "paid" && (
                          <>
                            <Button size="sm" onClick={() => markAsPaid(record.id)}>
                              Mark Paid
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditSalary(record)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingSalary(record)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {record.status === "paid" && record.paid_date && (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(record.paid_date), "dd MMM")}
                          </span>
                        )}
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

        <TabsContent value="advances" className="space-y-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Deduct From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Deduction</TableHead>
                  <TableHead className="max-w-[150px]">Reason</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : advances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-0">
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
                      <TableCell>
                        {advance.deduct_month ? (
                          <Badge variant="outline" className="font-mono">
                            {advance.deduct_month}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                      <TableCell className="max-w-[150px]">
                        <p className="line-clamp-1 text-sm text-muted-foreground">{advance.reason || "-"}</p>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title={advance.status === "settled" ? "Edit (will recalculate salary)" : "Edit advance"}
                              onClick={() => openEditAdvance(advance)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title={advance.status === "settled" ? "Delete (will recalculate salary)" : "Delete advance"}
                              onClick={() => setDeletingAdvance(advance)}
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
      </Tabs>

      {/* Edit Salary Dialog */}
      <Dialog open={!!editingSalary} onOpenChange={(open) => !open && setEditingSalary(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Salary Record</DialogTitle>
          </DialogHeader>
          {editingSalary && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">{editingSalary.employee?.full_name || "Employee"}</p>
                <p className="text-sm text-muted-foreground">
                  {months[editingSalary.month - 1]} {editingSalary.year}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary</Label>
                  <Input
                    type="number"
                    value={editSalaryForm.basic_salary}
                    onChange={(e) => setEditSalaryForm({ ...editSalaryForm, basic_salary: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus</Label>
                  <Input
                    type="number"
                    value={editSalaryForm.bonus}
                    onChange={(e) => setEditSalaryForm({ ...editSalaryForm, bonus: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deductions</Label>
                  <Input
                    type="number"
                    value={editSalaryForm.deductions}
                    onChange={(e) => setEditSalaryForm({ ...editSalaryForm, deductions: e.target.value })}
                  />
                </div>
              </div>

              {editingSalary.advance > 0 && (
                <Alert className="border-warning bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Advance Locked</AlertTitle>
                  <AlertDescription className="text-sm">
                    Advance deduction ({formatCurrency(editingSalary.advance)}) cannot be changed.
                    It was already deducted when this salary was generated.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editSalaryForm.notes}
                  onChange={(e) => setEditSalaryForm({ ...editSalaryForm, notes: e.target.value })}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Basic + Bonus</span>
                  <span>{formatCurrency(
                    safeParseFloat(editSalaryForm.basic_salary, 0, 0, 100000000) +
                    safeParseFloat(editSalaryForm.bonus, 0, 0, 100000000)
                  )}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deductions</span>
                  <span>- {formatCurrency(safeParseFloat(editSalaryForm.deductions, 0, 0, 100000000))}</span>
                </div>
                {editingSalary.advance > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Advance (locked)</span>
                    <span>- {formatCurrency(editingSalary.advance)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Net Payable</span>
                  <span className="text-2xl font-bold">{formatCurrency(calculateEditNetPayable())}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingSalary(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditSalary} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Salary Confirmation */}
      <AlertDialog open={!!deletingSalary} onOpenChange={(open) => !open && setDeletingSalary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary Record</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this salary record?</p>
              {deletingSalary && (
                <div className="bg-muted p-3 rounded-lg text-foreground text-sm">
                  <p><strong>{deletingSalary.employee?.full_name}</strong></p>
                  <p className="text-muted-foreground">
                    {months[deletingSalary.month - 1]} {deletingSalary.year} - {formatCurrency(deletingSalary.net_payable)}
                  </p>
                  {deletingSalary.advance > 0 && (
                    <p className="text-warning mt-2">
                      ⚠️ {formatCurrency(deletingSalary.advance)} advance will be restored to employee balance.
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSalary}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Advance Dialog */}
      <Dialog open={!!editingAdvance} onOpenChange={(open) => !open && setEditingAdvance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Advance</DialogTitle>
          </DialogHeader>
          {editingAdvance && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">{editingAdvance.employee?.full_name || "Employee"}</p>
                <p className="text-sm text-muted-foreground">
                  Created: {format(new Date(editingAdvance.date), "dd MMM yyyy")}
                </p>
              </div>

              {/* Warning for settled advances */}
              {editingAdvance.remaining_balance !== editingAdvance.amount && (
                <Alert className="border-warning bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">Salary Recalculation</AlertTitle>
                  <AlertDescription className="text-sm">
                    This advance has been deducted from salary. Editing will recalculate the related salary record.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={editAdvanceForm.amount}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Deduct From Month</Label>
                <Input
                  type="month"
                  value={editAdvanceForm.deduct_month}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, deduct_month: e.target.value })}
                  disabled={editingAdvance.remaining_balance !== editingAdvance.amount}
                />
                {editingAdvance.remaining_balance !== editingAdvance.amount && (
                  <p className="text-xs text-muted-foreground">
                    Deduct month cannot be changed after deduction
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  value={editAdvanceForm.reason}
                  onChange={(e) => setEditAdvanceForm({ ...editAdvanceForm, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingAdvance(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditAdvance} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Advance Confirmation */}
      <AlertDialog open={!!deletingAdvance} onOpenChange={(open) => !open && setDeletingAdvance(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Advance</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this advance?</p>
              {deletingAdvance && (
                <div className="bg-muted p-3 rounded-lg text-foreground text-sm">
                  <p><strong>{deletingAdvance.employee?.full_name}</strong></p>
                  <p className="text-muted-foreground">
                    Amount: {formatCurrency(deletingAdvance.amount)}
                  </p>
                  {deletingAdvance.remaining_balance !== deletingAdvance.amount && (
                    <Alert className="mt-3 border-warning bg-warning/10">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-warning text-xs">
                        This advance has been deducted from salary. Deleting will recalculate the related salary record and restore {formatCurrency(deletingAdvance.amount - (deletingAdvance.remaining_balance ?? deletingAdvance.amount))} to net payable.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAdvance}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Salary;
