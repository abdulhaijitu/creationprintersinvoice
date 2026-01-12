import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgScopedQuery } from "@/hooks/useOrgScopedQuery";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, UserCheck, UserX, Users, Plus, ClipboardList, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Database } from "@/integrations/supabase/types";
import { TimeInput } from "@/components/attendance/TimeInput";
import {
  formatDateTimeForDisplay,
  extractTimeFromDateTime,
  combineDateTime,
  validateAttendanceTimes,
  normalizeToTime24,
} from "@/lib/timeUtils";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

interface Employee {
  id: string;
  full_name: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  employee?: Employee | null;
}

interface TimeErrors {
  checkInError: string | null;
  checkOutError: string | null;
}

const Attendance = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const { hasPermission } = useOrgRolePermissions();
  
  // Database-driven permission checks
  const canViewAttendance = isSuperAdmin || hasPermission('attendance.view');
  const canCreateAttendance = isSuperAdmin || hasPermission('attendance.create');
  const canEditAttendance = isSuperAdmin || hasPermission('attendance.edit');
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [newAttendance, setNewAttendance] = useState({
    employee_id: "",
    check_in: "",
    check_out: "",
    status: "present" as AttendanceStatus,
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<TimeErrors>({
    checkInError: null,
    checkOutError: null,
  });
  
  // Track which rows are being updated
  const [updatingRows, setUpdatingRows] = useState<Set<string>>(new Set());

  // Check if current user is linked to an employee record
  useEffect(() => {
    const findUserEmployee = async () => {
      if (!organizationId || !user?.email) return;
      
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", user.email)
        .eq("is_active", true)
        .maybeSingle();
      
      setCurrentUserEmployeeId(data?.id || null);
    };
    
    if (hasOrgContext && organizationId && !isAdmin && !isSuperAdmin) {
      findUserEmployee();
    }
  }, [organizationId, hasOrgContext, user?.email, isAdmin, isSuperAdmin]);

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchData();
    }
  }, [selectedDate, selectedEmployee, organizationId, hasOrgContext, currentUserEmployeeId, isAdmin, isSuperAdmin]);

  const fetchData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("full_name");
      setEmployees(employeesData || []);

      // Fetch attendance for selected date
      let query = supabase
        .from("employee_attendance")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });

      // For non-admin users, only show their own attendance (if linked to employee)
      if (!isAdmin && !isSuperAdmin) {
        if (currentUserEmployeeId) {
          // User is linked to an employee - show only their records
          query = query.eq("employee_id", currentUserEmployeeId);
        } else {
          // User is not linked to any employee - show nothing
          setAttendance([]);
          setLoading(false);
          return;
        }
      } else if (selectedEmployee !== "all") {
        // Admin filtering by specific employee
        query = query.eq("employee_id", selectedEmployee);
      }

      const { data: attendanceData } = await query;

      if (attendanceData && employeesData) {
        const attendanceWithEmployee = attendanceData.map((record) => {
          const employee = employeesData.find((e) => e.id === record.employee_id);
          return { ...record, employee };
        });
        setAttendance(attendanceWithEmployee);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  // Validate form times before submission
  const validateFormTimes = useCallback((): boolean => {
    const errors = validateAttendanceTimes(newAttendance.check_in, newAttendance.check_out);
    setFormErrors(errors);
    return !errors.checkInError && !errors.checkOutError;
  }, [newAttendance.check_in, newAttendance.check_out]);

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAttendance.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    // Validate times
    if (!validateFormTimes()) {
      toast.error("Please fix the time errors before saving");
      return;
    }

    setAddLoading(true);
    try {
      // Check if attendance already exists for this employee on this date
      const { data: existing } = await supabase
        .from("employee_attendance")
        .select("id")
        .eq("employee_id", newAttendance.employee_id)
        .eq("date", selectedDate)
        .single();

      if (existing) {
        toast.error("Attendance already exists for this employee on this date");
        setAddLoading(false);
        return;
      }

      // Combine date and time for storage (properly normalized)
      const checkInTimestamp = combineDateTime(selectedDate, newAttendance.check_in);
      const checkOutTimestamp = combineDateTime(selectedDate, newAttendance.check_out);

      const { error } = await supabase.from("employee_attendance").insert({
        employee_id: newAttendance.employee_id,
        date: selectedDate,
        check_in: checkInTimestamp,
        check_out: checkOutTimestamp,
        status: newAttendance.status,
        notes: newAttendance.notes || null,
        organization_id: organizationId,
      });

      if (error) throw error;

      toast.success("Attendance added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error adding attendance:", error);
      toast.error("Failed to add attendance");
    } finally {
      setAddLoading(false);
    }
  };

  const resetForm = () => {
    setNewAttendance({
      employee_id: "",
      check_in: "",
      check_out: "",
      status: "present",
      notes: "",
    });
    setFormErrors({ checkInError: null, checkOutError: null });
  };

  const updateStatus = async (id: string, status: AttendanceStatus) => {
    try {
      const { error } = await supabase
        .from("employee_attendance")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(record => 
          record.id === id ? { ...record, status } : record
        )
      );
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      fetchData(); // Refresh on error
    }
  };

  const updateCheckIn = async (id: string, time: string, recordDate: string) => {
    // Validate time before updating
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) {
        toast.error("Invalid time format");
        return;
      }
      
      // Get the current record to validate against check-out
      const record = attendance.find(r => r.id === id);
      if (record?.check_out) {
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        const errors = validateAttendanceTimes(normalized, checkOutTime);
        if (errors.checkInError) {
          toast.error(errors.checkInError);
          return;
        }
        if (errors.checkOutError) {
          toast.error("Check-in time conflicts with check-out");
          return;
        }
      }
    }

    setUpdatingRows(prev => new Set(prev).add(id));
    
    try {
      const timestamp = time ? combineDateTime(recordDate, time) : null;
      
      const { error } = await supabase
        .from("employee_attendance")
        .update({ check_in: timestamp })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(record => 
          record.id === id ? { ...record, check_in: timestamp } : record
        )
      );
    } catch (error) {
      console.error("Error updating check-in:", error);
      toast.error("Failed to update check-in time");
      fetchData(); // Refresh on error
    } finally {
      setUpdatingRows(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const updateCheckOut = async (id: string, time: string, recordDate: string) => {
    // Validate time before updating
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) {
        toast.error("Invalid time format");
        return;
      }
      
      // Get the current record to validate against check-in
      const record = attendance.find(r => r.id === id);
      if (record?.check_in) {
        const checkInTime = extractTimeFromDateTime(record.check_in);
        const errors = validateAttendanceTimes(checkInTime, normalized);
        if (errors.checkOutError) {
          toast.error(errors.checkOutError);
          return;
        }
      }
    }

    setUpdatingRows(prev => new Set(prev).add(id));
    
    try {
      const timestamp = time ? combineDateTime(recordDate, time) : null;
      
      const { error } = await supabase
        .from("employee_attendance")
        .update({ check_out: timestamp })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(record => 
          record.id === id ? { ...record, check_out: timestamp } : record
        )
      );
    } catch (error) {
      console.error("Error updating check-out:", error);
      toast.error("Failed to update check-out time");
      fetchData(); // Refresh on error
    } finally {
      setUpdatingRows(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAllPresent = async () => {
    if (!window.confirm("Mark all employees as present for today?")) return;

    try {
      // Get employees not yet marked
      const existingIds = attendance.map((a) => a.employee_id);
      const unmarked = employees.filter((e) => !existingIds.includes(e.id));

      if (unmarked.length === 0) {
        toast.info("All employees already marked");
        return;
      }

      // Use current time in 24-hour format for check-in
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const checkInTimestamp = combineDateTime(selectedDate, currentTime);

      const records = unmarked.map((emp) => ({
        employee_id: emp.id,
        date: selectedDate,
        status: "present" as AttendanceStatus,
        check_in: checkInTimestamp,
        organization_id: organizationId,
      }));

      const { error } = await supabase.from("employee_attendance").insert(records);

      if (error) throw error;

      toast.success(`${unmarked.length} employees marked present`);
      fetchData();
    } catch (error) {
      console.error("Error marking all present:", error);
      toast.error("Failed to mark all present");
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return <Badge className="bg-success">Present</Badge>;
      case "absent":
        return <Badge variant="destructive">Absent</Badge>;
      case "late":
        return <Badge variant="secondary">Late</Badge>;
      case "half_day":
        return <Badge variant="outline">Half Day</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;

  // Clear form errors when form values change
  useEffect(() => {
    if (newAttendance.check_in || newAttendance.check_out) {
      const errors = validateAttendanceTimes(newAttendance.check_in, newAttendance.check_out);
      setFormErrors(errors);
    }
  }, [newAttendance.check_in, newAttendance.check_out]);

  const isFormValid = !formErrors.checkInError && !formErrors.checkOutError && newAttendance.employee_id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Employee attendance tracking</p>
        </div>
        {(isAdmin || canCreateAttendance) && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllPresent}>
              <UserCheck className="mr-2 h-4 w-4" />
              Mark All Present
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button type="button">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Attendance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Attendance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAttendance} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select
                      value={newAttendance.employee_id}
                      onValueChange={(v) => setNewAttendance({ ...newAttendance, employee_id: v })}
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

                  <div className="grid grid-cols-2 gap-4">
                    <TimeInput
                      label="Check In"
                      value={newAttendance.check_in}
                      onChange={(v) => setNewAttendance({ ...newAttendance, check_in: v })}
                      error={formErrors.checkInError}
                      showPreview={true}
                    />
                    <TimeInput
                      label="Check Out"
                      value={newAttendance.check_out}
                      onChange={(v) => setNewAttendance({ ...newAttendance, check_out: v })}
                      error={formErrors.checkOutError}
                      showPreview={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newAttendance.status}
                      onValueChange={(v) => setNewAttendance({ ...newAttendance, status: v as AttendanceStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={newAttendance.notes}
                      onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addLoading || !isFormValid}>
                      {addLoading ? "Adding..." : "Add"}
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
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{attendance.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{absentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lateCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Attendance Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Date</TableHead>
              <TableHead className="whitespace-nowrap">Employee</TableHead>
              <TableHead className="whitespace-nowrap">Check In</TableHead>
              <TableHead className="whitespace-nowrap">Check Out</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              {isAdmin && <TableHead className="whitespace-nowrap">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  <EmptyState
                    icon={ClipboardList}
                    title="No attendance records"
                    description="No attendance records found for the selected date"
                  />
                </TableCell>
              </TableRow>
            ) : (
              attendance.map((record) => (
                <TableRow key={record.id} className={updatingRows.has(record.id) ? 'opacity-50' : ''}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(record.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {record.employee?.full_name || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {isAdmin ? (
                      <Input
                        type="time"
                        value={extractTimeFromDateTime(record.check_in)}
                        onChange={(e) => updateCheckIn(record.id, e.target.value, record.date)}
                        className="w-[120px]"
                        disabled={updatingRows.has(record.id)}
                      />
                    ) : (
                      formatDateTimeForDisplay(record.check_in)
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {isAdmin ? (
                      <Input
                        type="time"
                        value={extractTimeFromDateTime(record.check_out)}
                        onChange={(e) => updateCheckOut(record.id, e.target.value, record.date)}
                        className="w-[120px]"
                        disabled={updatingRows.has(record.id)}
                      />
                    ) : (
                      formatDateTimeForDisplay(record.check_out)
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{getStatusBadge(record.status)}</TableCell>
                  {isAdmin && (
                    <TableCell className="whitespace-nowrap">
                      <Select
                        value={record.status}
                        onValueChange={(value) => updateStatus(record.id, value as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="half_day">Half Day</SelectItem>
                        </SelectContent>
                      </Select>
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

export default Attendance;
