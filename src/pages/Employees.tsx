import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { canRolePerform, OrgRole } from "@/lib/permissions/constants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatCurrency, getInitials } from "@/lib/formatters";

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

const Employees = () => {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const { orgRole } = useOrganization();
  
  // Permission checks using proper role system
  const canView = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'employees', 'view');
  const canCreate = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'employees', 'create');
  const canEdit = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'employees', 'edit');
  const canDelete = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'employees', 'delete');
  const canExport = isSuperAdmin || canRolePerform(orgRole as OrgRole, 'employees', 'export');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    designation: "",
    department: "",
    joining_date: "",
    basic_salary: "",
    address: "",
    nid: "",
  });
  const [newEmployeeData, setNewEmployeeData] = useState({
    full_name: "",
    phone: "",
    email: "",
    designation: "",
    department: "",
    basic_salary: "",
  });

  useEffect(() => {
    if (canView) fetchEmployees();
  }, [canView]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          email: formData.email || null,
          designation: formData.designation || null,
          department: formData.department || null,
          joining_date: formData.joining_date || null,
          basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : 0,
          address: formData.address || null,
          nid: formData.nid || null,
        })
        .eq("id", editingEmployee.id);

      if (error) throw error;

      toast.success("Employee information updated");
      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update information");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      email: "",
      designation: "",
      department: "",
      joining_date: "",
      basic_salary: "",
      address: "",
      nid: "",
    });
    setEditingEmployee(null);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmployeeData.full_name) {
      toast.error("Please enter employee name");
      return;
    }

    setAddLoading(true);
    try {
      const { error } = await supabase.from("employees").insert({
        full_name: newEmployeeData.full_name,
        phone: newEmployeeData.phone || null,
        email: newEmployeeData.email || null,
        designation: newEmployeeData.designation || null,
        department: newEmployeeData.department || null,
        basic_salary: newEmployeeData.basic_salary ? parseFloat(newEmployeeData.basic_salary) : 0,
      });

      if (error) throw error;

      toast.success("New employee added");
      setIsAddDialogOpen(false);
      setNewEmployeeData({ full_name: "", phone: "", email: "", designation: "", department: "", basic_salary: "" });
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
      fetchEmployees();
    } catch (error) {
      console.error("Error removing employee:", error);
      toast.error("Failed to remove employee");
    }
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      phone: employee.phone || "",
      email: employee.email || "",
      designation: employee.designation || "",
      department: employee.department || "",
      joining_date: employee.joining_date || "",
      basic_salary: employee.basic_salary?.toString() || "",
      address: employee.address || "",
      nid: employee.nid || "",
    });
    setIsDialogOpen(true);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm) ||
      emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  if (authLoading) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} columns={7} />
      </div>
    );
  }

  // Show access denied message for users without permission
  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">
            List of all employees
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
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                New Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Add a new employee (no login account required)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_full_name">Name *</Label>
                  <Input
                    id="new_full_name"
                    placeholder="Employee name"
                    value={newEmployeeData.full_name}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_phone">Phone</Label>
                    <Input
                      id="new_phone"
                      placeholder="01XXXXXXXXX"
                      value={newEmployeeData.phone}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_email">Email</Label>
                    <Input
                      id="new_email"
                      type="email"
                      placeholder="email@example.com"
                      value={newEmployeeData.email}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_designation">Designation</Label>
                    <Input
                      id="new_designation"
                      placeholder="e.g. Designer"
                      value={newEmployeeData.designation}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, designation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_department">Department</Label>
                    <Input
                      id="new_department"
                      placeholder="e.g. Production"
                      value={newEmployeeData.department}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_basic_salary">Basic Salary</Label>
                  <Input
                    id="new_basic_salary"
                    type="number"
                    placeholder="0"
                    value={newEmployeeData.basic_salary}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, basic_salary: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading ? "Adding..." : "Add Employee"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                      onClick: () => setIsDialogOpen(true),
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee Information</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nid">NID</Label>
                <Input
                  id="nid"
                  value={formData.nid}
                  onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic_salary">Basic Salary</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
