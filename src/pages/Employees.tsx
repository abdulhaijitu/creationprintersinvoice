import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users, Phone, Briefcase, Edit2, UserPlus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, getInitials } from "@/lib/formatters";
import { parseValidatedFloat } from "@/lib/validation";
import { 
  validateField, 
  validateForm, 
  hasFormChanges,
  type FieldErrors 
} from "@/components/employees/EmployeeFormValidation";
import { UnsavedChangesDialog } from "@/components/employees/UnsavedChangesDialog";
import { SalaryHistoryPanel } from "@/components/employees/SalaryHistoryPanel";
import { SalaryChangeConfirmDialog } from "@/components/employees/SalaryChangeConfirmDialog";
import { FormFieldWithError } from "@/components/employees/FormFieldWithError";

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  basic_salary: number;
  address: string | null;
  nid: string | null;
  is_active: boolean;
}

const initialFormData = {
  full_name: "",
  phone: "",
  email: "",
  designation: "",
  department: "",
  joining_date: "",
  basic_salary: "",
  address: "",
  nid: "",
};

const Employees = () => {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { orgRole, organization } = useOrganization();
  const { hasPermission } = useOrgRolePermissions();
  
  // Permission checks using database-driven permissions
  const canView = isSuperAdmin || hasPermission('employees.view');
  const canCreate = isSuperAdmin || hasPermission('employees.create');
  const canEdit = isSuperAdmin || hasPermission('employees.edit');
  const canDelete = isSuperAdmin || hasPermission('employees.delete');
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState(initialFormData);
  const [originalFormData, setOriginalFormData] = useState(initialFormData);
  const [newEmployeeData, setNewEmployeeData] = useState(initialFormData);
  const [originalNewEmployeeData, setOriginalNewEmployeeData] = useState(initialFormData);
  
  // Validation state
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [newErrors, setNewErrors] = useState<FieldErrors>({});
  const [newTouched, setNewTouched] = useState<Record<string, boolean>>({});
  
  // Unsaved changes state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<"edit" | "add" | null>(null);
  
  // Salary change confirmation
  const [showSalaryConfirm, setShowSalaryConfirm] = useState(false);
  const [pendingSalaryChange, setPendingSalaryChange] = useState<{
    oldSalary: number;
    newSalary: number;
    updateData: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    if (canView && organization?.id) fetchEmployees();
  }, [canView, organization?.id]);

  const fetchEmployees = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Validation handlers
  const handleFieldBlur = useCallback((fieldName: keyof FieldErrors, isNew = false) => {
    const data = isNew ? newEmployeeData : formData;
    const value = data[fieldName as keyof typeof data] || "";
    const error = validateField(fieldName as any, value);
    
    if (isNew) {
      setNewTouched(prev => ({ ...prev, [fieldName]: true }));
      setNewErrors(prev => ({ ...prev, [fieldName]: error }));
    } else {
      setTouched(prev => ({ ...prev, [fieldName]: true }));
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [formData, newEmployeeData]);

  const handleFieldChange = useCallback((
    fieldName: string, 
    value: string, 
    isNew = false
  ) => {
    if (isNew) {
      setNewEmployeeData(prev => ({ ...prev, [fieldName]: value }));
      // Clear error on change if touched
      if (newTouched[fieldName]) {
        const error = validateField(fieldName as any, value);
        setNewErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
      if (touched[fieldName]) {
        const error = validateField(fieldName as any, value);
        setErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    }
  }, [touched, newTouched]);

  // Check if form has unsaved changes
  const hasEditChanges = hasFormChanges(formData, originalFormData);
  const hasAddChanges = hasFormChanges(newEmployeeData, originalNewEmployeeData);

  // Handle dialog close with unsaved changes check
  const handleEditDialogClose = (open: boolean) => {
    // Opening the dialog
    if (open) return;
    
    // Closing the dialog - check for unsaved changes
    if (hasEditChanges && !editLoading) {
      setPendingCloseAction("edit");
      setShowUnsavedDialog(true);
      return;
    }
    
    closeEditDialog();
  };

  const handleAddDialogClose = (open: boolean) => {
    // Opening the dialog - allow it
    if (open) {
      setIsAddDialogOpen(true);
      return;
    }
    
    // Closing the dialog - check for unsaved changes
    if (hasAddChanges && !addLoading) {
      setPendingCloseAction("add");
      setShowUnsavedDialog(true);
      return;
    }
    
    closeAddDialog();
  };

  // Explicit open handler for the button
  const handleOpenAddDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("[Employees] New Employee button clicked");
    resetAddForm();
    setIsAddDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsDialogOpen(false);
    resetEditForm();
  };

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
    resetAddForm();
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    if (pendingCloseAction === "edit") {
      closeEditDialog();
    } else if (pendingCloseAction === "add") {
      closeAddDialog();
    }
    setPendingCloseAction(null);
  };

  const handleContinueEditing = () => {
    setShowUnsavedDialog(false);
    setPendingCloseAction(null);
  };

  const resetEditForm = () => {
    setFormData(initialFormData);
    setOriginalFormData(initialFormData);
    setEditingEmployee(null);
    setErrors({});
    setTouched({});
  };

  const resetAddForm = () => {
    setNewEmployeeData(initialFormData);
    setOriginalNewEmployeeData(initialFormData);
    setNewErrors({});
    setNewTouched({});
  };

  // Create salary history record
  const createSalaryHistoryRecord = async (
    employeeId: string,
    salaryAmount: number,
    notes?: string
  ) => {
    if (!organization?.id || !user?.id) return;

    try {
      await supabase.from("employee_salary_history").insert({
        employee_id: employeeId,
        organization_id: organization.id,
        salary_amount: salaryAmount,
        effective_date: new Date().toISOString().split("T")[0],
        updated_by: user.id,
        notes: notes || null,
      });
    } catch (error) {
      console.error("Error creating salary history:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee || !organization?.id) return;

    // Full form validation
    const { isValid, errors: validationErrors } = validateForm(formData);
    setErrors(validationErrors);
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (!isValid) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (editLoading) return;

    // Parse salary
    let validatedSalary: number;
    try {
      validatedSalary = parseValidatedFloat(formData.basic_salary, 'Basic salary', 0, 10000000);
    } catch (validationError: any) {
      setErrors(prev => ({ ...prev, basic_salary: validationError.message }));
      return;
    }

    const updateData = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      designation: formData.designation.trim() || null,
      department: formData.department.trim() || null,
      joining_date: formData.joining_date || null,
      basic_salary: validatedSalary,
      address: formData.address.trim() || null,
      nid: formData.nid.trim() || null,
    };

    // Check if salary changed
    const oldSalary = editingEmployee.basic_salary || 0;
    if (validatedSalary !== oldSalary) {
      setPendingSalaryChange({ oldSalary, newSalary: validatedSalary, updateData });
      setShowSalaryConfirm(true);
      return;
    }

    await performUpdate(updateData, false);
  };

  const performUpdate = async (updateData: Record<string, any>, recordSalaryHistory: boolean) => {
    if (!editingEmployee || !organization?.id) return;

    setEditLoading(true);

    try {
      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", editingEmployee.id)
        .eq("organization_id", organization.id);

      if (error) throw error;

      // Record salary history if salary changed
      if (recordSalaryHistory && pendingSalaryChange) {
        await createSalaryHistoryRecord(
          editingEmployee.id,
          pendingSalaryChange.newSalary,
          `Salary updated from ${formatCurrency(pendingSalaryChange.oldSalary)}`
        );
      }

      // Optimistic UI update
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === editingEmployee.id
            ? { ...emp, ...updateData }
            : emp
        )
      );

      toast.success("Employee updated successfully");
      closeEditDialog();
      setShowSalaryConfirm(false);
      setPendingSalaryChange(null);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      toast.error(error.message || "Failed to update employee");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSalaryConfirm = () => {
    if (pendingSalaryChange) {
      performUpdate(pendingSalaryChange.updateData, true);
    }
  };

  const handleSalaryCancel = () => {
    setShowSalaryConfirm(false);
    setPendingSalaryChange(null);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization?.id) return;

    // Full form validation
    const { isValid, errors: validationErrors } = validateForm(newEmployeeData);
    setNewErrors(validationErrors);
    setNewTouched(Object.keys(newEmployeeData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (!isValid) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (addLoading) return;

    let validatedSalary: number;
    try {
      validatedSalary = parseValidatedFloat(newEmployeeData.basic_salary, 'Basic salary', 0, 10000000);
    } catch (validationError: any) {
      setNewErrors(prev => ({ ...prev, basic_salary: validationError.message }));
      return;
    }

    setAddLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          full_name: newEmployeeData.full_name.trim(),
          phone: newEmployeeData.phone.trim() || null,
          email: newEmployeeData.email.trim() || null,
          designation: newEmployeeData.designation.trim() || null,
          department: newEmployeeData.department.trim() || null,
          joining_date: newEmployeeData.joining_date || null,
          basic_salary: validatedSalary,
          address: newEmployeeData.address.trim() || null,
          nid: newEmployeeData.nid.trim() || null,
          organization_id: organization.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial salary history record
      if (data && validatedSalary > 0) {
        await createSalaryHistoryRecord(data.id, validatedSalary, "Initial salary");
      }

      toast.success("New employee added");
      closeAddDialog();
      fetchEmployees();
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "Failed to add employee");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("employees")
        .update({ is_active: false })
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Employee removed");
      setDeleteId(null);
      setEmployees(prev => prev.filter(emp => emp.id !== deleteId));
    } catch (error) {
      console.error("Error removing employee:", error);
      toast.error("Failed to remove employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    const data = {
      full_name: employee.full_name,
      phone: employee.phone || "",
      email: employee.email || "",
      designation: employee.designation || "",
      department: employee.department || "",
      joining_date: employee.joining_date || "",
      basic_salary: employee.basic_salary?.toString() || "",
      address: employee.address || "",
      nid: employee.nid || "",
    };
    setEditingEmployee(employee);
    setFormData(data);
    setOriginalFormData(data);
    setErrors({});
    setTouched({});
    setIsDialogOpen(true);
  };


  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if form is valid for save button
  const isEditFormValid = formData.full_name.trim().length >= 2 && !Object.values(errors).some(Boolean);
  const isAddFormValid = newEmployeeData.full_name.trim().length >= 2 && !Object.values(newErrors).some(Boolean);

  if (authLoading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">List of all employees</p>
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
                  You don't have permission to view the employee list.
                  Contact your organization owner or manager if you need access.
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
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">List of all employees</p>
        </div>
        {canCreate && (
          <>
            <Button 
              type="button"
              onClick={handleOpenAddDialog}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              New Employee
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogClose}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Add a new employee (no login account required)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <FormFieldWithError
                  id="new_full_name"
                  label="Name"
                  value={newEmployeeData.full_name}
                  onChange={(v) => handleFieldChange("full_name", v, true)}
                  onBlur={() => handleFieldBlur("full_name", true)}
                  error={newErrors.full_name}
                  touched={newTouched.full_name}
                  placeholder="Employee name"
                  required
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWithError
                    id="new_phone"
                    label="Phone"
                    value={newEmployeeData.phone}
                    onChange={(v) => handleFieldChange("phone", v, true)}
                    onBlur={() => handleFieldBlur("phone", true)}
                    error={newErrors.phone}
                    touched={newTouched.phone}
                    placeholder="01XXXXXXXXX"
                  />
                  <FormFieldWithError
                    id="new_email"
                    label="Email"
                    type="email"
                    value={newEmployeeData.email}
                    onChange={(v) => handleFieldChange("email", v, true)}
                    onBlur={() => handleFieldBlur("email", true)}
                    error={newErrors.email}
                    touched={newTouched.email}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWithError
                    id="new_designation"
                    label="Designation"
                    value={newEmployeeData.designation}
                    onChange={(v) => handleFieldChange("designation", v, true)}
                    onBlur={() => handleFieldBlur("designation", true)}
                    error={newErrors.designation}
                    touched={newTouched.designation}
                    placeholder="e.g. Designer"
                  />
                  <FormFieldWithError
                    id="new_department"
                    label="Department"
                    value={newEmployeeData.department}
                    onChange={(v) => handleFieldChange("department", v, true)}
                    onBlur={() => handleFieldBlur("department", true)}
                    error={newErrors.department}
                    touched={newTouched.department}
                    placeholder="e.g. Production"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWithError
                    id="new_joining_date"
                    label="Joining Date"
                    type="date"
                    value={newEmployeeData.joining_date}
                    onChange={(v) => handleFieldChange("joining_date", v, true)}
                    onBlur={() => handleFieldBlur("joining_date", true)}
                    error={newErrors.joining_date}
                    touched={newTouched.joining_date}
                  />
                  <FormFieldWithError
                    id="new_basic_salary"
                    label="Basic Salary"
                    type="number"
                    value={newEmployeeData.basic_salary}
                    onChange={(v) => handleFieldChange("basic_salary", v, true)}
                    onBlur={() => handleFieldBlur("basic_salary", true)}
                    error={newErrors.basic_salary}
                    touched={newTouched.basic_salary}
                    placeholder="0"
                  />
                </div>

                <FormFieldWithError
                  id="new_address"
                  label="Address"
                  value={newEmployeeData.address}
                  onChange={(v) => handleFieldChange("address", v, true)}
                  onBlur={() => handleFieldBlur("address", true)}
                  error={newErrors.address}
                  touched={newTouched.address}
                  placeholder="Full address"
                />

                <FormFieldWithError
                  id="new_nid"
                  label="NID"
                  value={newEmployeeData.nid}
                  onChange={(v) => handleFieldChange("nid", v, true)}
                  onBlur={() => handleFieldBlur("nid", true)}
                  error={newErrors.nid}
                  touched={newTouched.nid}
                  placeholder="National ID"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddDialogClose(true)}
                    disabled={addLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addLoading || !isAddFormValid}>
                    {addLoading ? "Adding..." : "Add Employee"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>
        )}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Total Employees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{employees.length}</p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-[800px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Name</TableHead>
              <TableHead className="whitespace-nowrap">Designation</TableHead>
              <TableHead className="whitespace-nowrap">Department</TableHead>
              <TableHead className="whitespace-nowrap">Phone</TableHead>
              <TableHead className="whitespace-nowrap">Joining Date</TableHead>
              <TableHead className="text-right whitespace-nowrap">Salary</TableHead>
              {(canEdit || canDelete) && <TableHead className="text-center whitespace-nowrap">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-0">
                  <EmptyState
                    icon={Users}
                    title="No employees found"
                    description={searchTerm 
                      ? "Try adjusting your search criteria" 
                      : "Add your first employee to manage your workforce"}
                    action={canCreate && !searchTerm ? {
                      label: "Add Employee",
                      onClick: () => {
                        resetAddForm();
                        setIsAddDialogOpen(true);
                      },
                      icon: UserPlus,
                    } : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.full_name}</p>
                        {employee.nid && (
                          <p className="text-sm text-muted-foreground">NID: {employee.nid}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {employee.designation ? (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {employee.designation}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{employee.department || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {employee.phone ? (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {employee.phone}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {employee.joining_date
                      ? format(new Date(employee.joining_date), "dd MMM yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(employee.basic_salary || 0)}
                  </TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(employee)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(employee.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                id="full_name"
                label="Name"
                value={formData.full_name}
                onChange={(v) => handleFieldChange("full_name", v)}
                onBlur={() => handleFieldBlur("full_name")}
                error={errors.full_name}
                touched={touched.full_name}
                required
              />
              <FormFieldWithError
                id="phone"
                label="Phone"
                value={formData.phone}
                onChange={(v) => handleFieldChange("phone", v)}
                onBlur={() => handleFieldBlur("phone")}
                error={errors.phone}
                touched={touched.phone}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(v) => handleFieldChange("email", v)}
                onBlur={() => handleFieldBlur("email")}
                error={errors.email}
                touched={touched.email}
              />
              <FormFieldWithError
                id="nid"
                label="NID"
                value={formData.nid}
                onChange={(v) => handleFieldChange("nid", v)}
                onBlur={() => handleFieldBlur("nid")}
                error={errors.nid}
                touched={touched.nid}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                id="designation"
                label="Designation"
                value={formData.designation}
                onChange={(v) => handleFieldChange("designation", v)}
                onBlur={() => handleFieldBlur("designation")}
                error={errors.designation}
                touched={touched.designation}
              />
              <FormFieldWithError
                id="department"
                label="Department"
                value={formData.department}
                onChange={(v) => handleFieldChange("department", v)}
                onBlur={() => handleFieldBlur("department")}
                error={errors.department}
                touched={touched.department}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormFieldWithError
                id="joining_date"
                label="Joining Date"
                type="date"
                value={formData.joining_date}
                onChange={(v) => handleFieldChange("joining_date", v)}
                onBlur={() => handleFieldBlur("joining_date")}
                error={errors.joining_date}
                touched={touched.joining_date}
              />
              <FormFieldWithError
                id="basic_salary"
                label="Basic Salary"
                type="number"
                value={formData.basic_salary}
                onChange={(v) => handleFieldChange("basic_salary", v)}
                onBlur={() => handleFieldBlur("basic_salary")}
                error={errors.basic_salary}
                touched={touched.basic_salary}
              />
            </div>

            <FormFieldWithError
              id="address"
              label="Address"
              value={formData.address}
              onChange={(v) => handleFieldChange("address", v)}
              onBlur={() => handleFieldBlur("address")}
              error={errors.address}
              touched={touched.address}
            />

            {/* Salary History Panel */}
            {editingEmployee && (
              <SalaryHistoryPanel 
                employeeId={editingEmployee.id} 
                currentSalary={editingEmployee.basic_salary || 0}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditDialogClose(true)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading || !isEditFormValid}>
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onDiscard={handleDiscardChanges}
        onContinueEditing={handleContinueEditing}
      />

      {/* Salary Change Confirmation Dialog */}
      {pendingSalaryChange && (
        <SalaryChangeConfirmDialog
          open={showSalaryConfirm}
          onOpenChange={setShowSalaryConfirm}
          currentSalary={pendingSalaryChange.oldSalary}
          newSalary={pendingSalaryChange.newSalary}
          onConfirm={handleSalaryConfirm}
          onCancel={handleSalaryCancel}
          isLoading={editLoading}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Remove Employee"
        description="Are you sure you want to remove this employee? This action will deactivate their profile."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDeleteEmployee}
      />
    </div>
  );
};

export default Employees;
