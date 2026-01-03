import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Search, Users, Phone, Mail, Briefcase, Edit2, Plus, UserPlus, Trash2, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  joining_date: string | null;
  basic_salary: number;
  address: string | null;
  nid: string | null;
  role?: string;
}

const Employees = () => {
  const { isAdmin, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    designation: "",
    department: "",
    joining_date: "",
    basic_salary: "",
    address: "",
    nid: "",
    role: "employee" as string,
  });
  const [newEmployeeData, setNewEmployeeData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, [isAdmin]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("*");
      
      if (!isAdmin) {
        // Non-admins can only see their own profile
        query = query.eq("id", user?.id);
      }

      const { data: profilesData } = await query.order("full_name");

      if (profilesData) {
        // Fetch roles for each employee
        const employeesWithRoles = await Promise.all(
          profilesData.map(async (profile) => {
            const { data: roleData } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", profile.id)
              .single();

            return {
              ...profile,
              role: roleData?.role || "employee",
            };
          })
        );
        setEmployees(employeesWithRoles);
      }
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
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          designation: formData.designation || null,
          department: formData.department || null,
          joining_date: formData.joining_date || null,
          basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : 0,
          address: formData.address || null,
          nid: formData.nid || null,
        })
        .eq("id", editingEmployee.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (formData.role !== editingEmployee.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: formData.role as "admin" | "employee" })
          .eq("user_id", editingEmployee.id);

        if (roleError) throw roleError;
      }

      toast.success("কর্মচারী তথ্য আপডেট হয়েছে");
      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("তথ্য আপডেট ব্যর্থ হয়েছে");
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      phone: "",
      designation: "",
      department: "",
      joining_date: "",
      basic_salary: "",
      address: "",
      nid: "",
      role: "employee",
    });
    setEditingEmployee(null);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmployeeData.email || !newEmployeeData.password || !newEmployeeData.full_name) {
      toast.error("সকল প্রয়োজনীয় তথ্য দিন");
      return;
    }

    setAddLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: newEmployeeData.email,
        password: newEmployeeData.password,
        options: {
          data: {
            full_name: newEmployeeData.full_name,
            phone: newEmployeeData.phone || null,
          },
        },
      });

      if (error) throw error;

      toast.success("নতুন কর্মচারী অ্যাকাউন্ট তৈরি হয়েছে");
      setIsAddDialogOpen(false);
      setNewEmployeeData({ email: "", password: "", full_name: "", phone: "" });
      setTimeout(() => fetchEmployees(), 1000);
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error(error.message || "কর্মচারী যোগ করতে সমস্যা হয়েছে");
    } finally {
      setAddLoading(false);
    }
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      phone: employee.phone || "",
      designation: employee.designation || "",
      department: employee.department || "",
      joining_date: employee.joining_date || "",
      basic_salary: employee.basic_salary?.toString() || "",
      address: employee.address || "",
      nid: employee.nid || "",
      role: employee.role || "employee",
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">কর্মচারী</h1>
          <p className="text-muted-foreground">সকল কর্মচারীর তালিকা</p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                নতুন কর্মচারী
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>নতুন কর্মচারী যোগ করুন</DialogTitle>
                <DialogDescription>
                  নতুন কর্মচারীর জন্য লগইন অ্যাকাউন্ট তৈরি করুন
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_full_name">নাম *</Label>
                  <Input
                    id="new_full_name"
                    placeholder="কর্মচারীর নাম"
                    value={newEmployeeData.full_name}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, full_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_email">ইমেইল *</Label>
                    <Input
                      id="new_email"
                      type="email"
                      placeholder="email@example.com"
                      value={newEmployeeData.email}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password">পাসওয়ার্ড *</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="ন্যূনতম ৬ অক্ষর"
                      value={newEmployeeData.password}
                      onChange={(e) => setNewEmployeeData({ ...newEmployeeData, password: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_phone">ফোন</Label>
                  <Input
                    id="new_phone"
                    placeholder="01XXXXXXXXX"
                    value={newEmployeeData.phone}
                    onChange={(e) => setNewEmployeeData({ ...newEmployeeData, phone: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit" disabled={addLoading}>
                    {addLoading ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
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
            মোট কর্মচারী
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
          placeholder="কর্মচারী খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>পদবি</TableHead>
              <TableHead>বিভাগ</TableHead>
              <TableHead>ফোন</TableHead>
              <TableHead>যোগদান</TableHead>
              <TableHead className="text-right">বেতন</TableHead>
              <TableHead>ভূমিকা</TableHead>
              {isAdmin && <TableHead className="text-center">অ্যাকশন</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  কোনো কর্মচারী পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
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
                  <TableCell>
                    {employee.designation ? (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {employee.designation}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>
                    {employee.phone ? (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {employee.phone}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {employee.joining_date
                      ? format(new Date(employee.joining_date), "dd MMM yyyy", { locale: bn })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(employee.basic_salary || 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.role === "admin" ? "default" : "secondary"}>
                      {employee.role === "admin" ? "এডমিন" : "কর্মচারী"}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(employee)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>কর্মচারী তথ্য সম্পাদনা</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">নাম *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">ফোন</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designation">পদবি</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">বিভাগ</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joining_date">যোগদান তারিখ</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basic_salary">মূল বেতন</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nid">NID নম্বর</Label>
                <Input
                  id="nid"
                  value={formData.nid}
                  onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">ভূমিকা</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ভূমিকা নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        কর্মচারী
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        এডমিন
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">ঠিকানা</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                বাতিল
              </Button>
              <Button type="submit">সংরক্ষণ করুন</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
