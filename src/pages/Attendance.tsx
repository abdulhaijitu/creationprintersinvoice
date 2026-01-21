import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgScopedQuery } from "@/hooks/useOrgScopedQuery";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
import { useWeeklyHolidays } from "@/hooks/useWeeklyHolidays";
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
import { Calendar, Clock, UserCheck, UserX, Users, Plus, ClipboardList, Moon, AlertTriangle, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { Database } from "@/integrations/supabase/types";
import { EnhancedTimeInput } from "@/components/attendance/EnhancedTimeInput";
import { TimeInput } from "@/components/attendance/TimeInput";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { MarkAllPresentDialog } from "@/components/attendance/MarkAllPresentDialog";
import { AttendanceTableSkeleton } from "@/components/attendance/AttendanceTableSkeleton";
import { OvernightShiftToggle } from "@/components/attendance/OvernightShiftToggle";
import {
  extractTimeFromDateTime,
  normalizeToTime24,
} from "@/lib/timeUtils";
import {
  validateAttendanceTimesEnhanced,
  combineAttendanceDateTime,
  calculateAttendanceStatus,
  detectOvernightScenario,
  formatDuration,
  calculateDuration,
  DEFAULT_ATTENDANCE_SETTINGS,
} from "@/lib/attendanceValidation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  is_overnight_shift?: boolean;
  employee?: Employee | null;
}

interface TimeErrors {
  checkInError: string | null;
  checkOutError: string | null;
  requiresOvernightFlag: boolean;
}

const Attendance = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const { hasPermission } = useOrgRolePermissions();
  const { isWeeklyHoliday, getWeekdayLabel, loading: holidaysLoading } = useWeeklyHolidays();
  
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
  const [isMarkAllDialogOpen, setIsMarkAllDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string | null>(null);
  const [newAttendance, setNewAttendance] = useState({
    employee_id: "",
    check_in: "",
    check_out: "",
    status: "present" as AttendanceStatus,
    notes: "",
    is_overnight_shift: false,
  });
  const [formErrors, setFormErrors] = useState<TimeErrors>({
    checkInError: null,
    checkOutError: null,
    requiresOvernightFlag: false,
  });
  
  // Track which rows are being updated
  const [updatingRows, setUpdatingRows] = useState<Set<string>>(new Set());
  // Track row-level errors for inline display
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});

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

  // Validate form times with overnight shift consideration
  const validateFormTimes = useCallback((): boolean => {
    const validation = validateAttendanceTimesEnhanced(
      newAttendance.check_in,
      newAttendance.check_out,
      newAttendance.is_overnight_shift
    );
    setFormErrors({
      checkInError: validation.checkInError,
      checkOutError: validation.checkOutError,
      requiresOvernightFlag: validation.requiresOvernightFlag,
    });
    return validation.isValid;
  }, [newAttendance.check_in, newAttendance.check_out, newAttendance.is_overnight_shift]);

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAttendance.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    // Validate times
    if (!validateFormTimes()) {
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
      const checkInTimestamp = combineAttendanceDateTime(
        selectedDate, 
        newAttendance.check_in,
        false,
        false
      );
      const checkOutTimestamp = combineAttendanceDateTime(
        selectedDate, 
        newAttendance.check_out,
        true,
        newAttendance.is_overnight_shift
      );

      // Auto-calculate status if not manually set
      const autoStatus = calculateAttendanceStatus(
        newAttendance.check_in,
        DEFAULT_ATTENDANCE_SETTINGS
      );

      const { error } = await supabase.from("employee_attendance").insert({
        employee_id: newAttendance.employee_id,
        date: selectedDate,
        check_in: checkInTimestamp,
        check_out: checkOutTimestamp,
        status: newAttendance.status || autoStatus,
        notes: newAttendance.notes || null,
        is_overnight_shift: newAttendance.is_overnight_shift,
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
      is_overnight_shift: false,
    });
    setFormErrors({ checkInError: null, checkOutError: null, requiresOvernightFlag: false });
  };

  const updateStatus = async (id: string, status: AttendanceStatus) => {
    setUpdatingRows(prev => new Set(prev).add(id));
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
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      fetchData(); // Refresh on error
    } finally {
      setUpdatingRows(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const updateCheckIn = async (id: string, time: string, recordDate: string) => {
    // Validate time before updating
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) {
        setRowErrors(prev => ({ ...prev, [id]: "Invalid time format" }));
        return;
      }
      
      // Get the current record to validate against check-out
      const record = attendance.find(r => r.id === id);
      if (record?.check_out) {
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        const validation = validateAttendanceTimesEnhanced(
          normalized, 
          checkOutTime, 
          record.is_overnight_shift || false
        );
        
        if (!validation.isValid) {
          setRowErrors(prev => ({ 
            ...prev, 
            [id]: validation.checkInError || validation.checkOutError || "Invalid time"
          }));
          return;
        }
      }
    }

    setRowErrors(prev => ({ ...prev, [id]: null }));
    setUpdatingRows(prev => new Set(prev).add(id));
    
    try {
      const timestamp = time ? combineAttendanceDateTime(recordDate, time, false, false) : null;
      
      // Auto-calculate status based on new check-in time
      const autoStatus = time ? calculateAttendanceStatus(time, DEFAULT_ATTENDANCE_SETTINGS) : 'absent';
      
      const { error } = await supabase
        .from("employee_attendance")
        .update({ 
          check_in: timestamp,
          status: autoStatus
        })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(record => 
          record.id === id ? { ...record, check_in: timestamp, status: autoStatus } : record
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
    const record = attendance.find(r => r.id === id);
    
    // Validate time before updating
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) {
        setRowErrors(prev => ({ ...prev, [id]: "Invalid time format" }));
        return;
      }
      
      if (record?.check_in) {
        const checkInTime = extractTimeFromDateTime(record.check_in);
        const validation = validateAttendanceTimesEnhanced(
          checkInTime, 
          normalized, 
          record.is_overnight_shift || false
        );
        
        if (!validation.isValid) {
          if (validation.requiresOvernightFlag) {
            setRowErrors(prev => ({ 
              ...prev, 
              [id]: "Enable overnight shift for next-day check-out"
            }));
          } else {
            setRowErrors(prev => ({ 
              ...prev, 
              [id]: validation.checkOutError || "Invalid time"
            }));
          }
          return;
        }
      }
    }

    setRowErrors(prev => ({ ...prev, [id]: null }));
    setUpdatingRows(prev => new Set(prev).add(id));
    
    try {
      const timestamp = time ? combineAttendanceDateTime(
        recordDate, 
        time, 
        true, 
        record?.is_overnight_shift || false
      ) : null;
      
      const { error } = await supabase
        .from("employee_attendance")
        .update({ check_out: timestamp })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(r => 
          r.id === id ? { ...r, check_out: timestamp } : r
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

  const toggleOvernightShift = async (id: string, isOvernight: boolean) => {
    setUpdatingRows(prev => new Set(prev).add(id));
    
    try {
      const record = attendance.find(r => r.id === id);
      if (!record) return;

      // Recalculate check-out timestamp if needed
      let newCheckOut = record.check_out;
      if (record.check_out && record.check_in) {
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        newCheckOut = combineAttendanceDateTime(
          record.date,
          checkOutTime,
          true,
          isOvernight
        );
      }

      const { error } = await supabase
        .from("employee_attendance")
        .update({ 
          is_overnight_shift: isOvernight,
          check_out: newCheckOut
        })
        .eq("id", id);

      if (error) throw error;

      // Optimistic update
      setAttendance(prev => 
        prev.map(r => 
          r.id === id ? { ...r, is_overnight_shift: isOvernight, check_out: newCheckOut } : r
        )
      );
      
      // Clear any row errors related to overnight
      setRowErrors(prev => ({ ...prev, [id]: null }));
    } catch (error) {
      console.error("Error updating overnight shift:", error);
      toast.error("Failed to update overnight shift");
      fetchData();
    } finally {
      setUpdatingRows(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAllPresent = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return;
    
    setMarkAllLoading(true);
    try {
      // Use current time in 24-hour format for check-in
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const checkInTimestamp = combineAttendanceDateTime(selectedDate, currentTime, false, false);
      
      // Auto-calculate status
      const autoStatus = calculateAttendanceStatus(currentTime, DEFAULT_ATTENDANCE_SETTINGS);

      const records = employeeIds.map((empId) => ({
        employee_id: empId,
        date: selectedDate,
        status: autoStatus,
        check_in: checkInTimestamp,
        is_overnight_shift: false,
        organization_id: organizationId,
      }));

      const { error } = await supabase.from("employee_attendance").insert(records);

      if (error) throw error;

      toast.success(`${employeeIds.length} employees marked present`);
      fetchData();
    } catch (error) {
      console.error("Error marking all present:", error);
      toast.error("Failed to mark all present");
    } finally {
      setMarkAllLoading(false);
    }
  };

  const presentCount = attendance.filter((a) => a.status === "present").length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const lateCount = attendance.filter((a) => a.status === "late").length;

  // Clear form errors when form values change
  useEffect(() => {
    if (newAttendance.check_in || newAttendance.check_out) {
      const validation = validateAttendanceTimesEnhanced(
        newAttendance.check_in,
        newAttendance.check_out,
        newAttendance.is_overnight_shift
      );
      setFormErrors({
        checkInError: validation.checkInError,
        checkOutError: validation.checkOutError,
        requiresOvernightFlag: validation.requiresOvernightFlag,
      });
    }
  }, [newAttendance.check_in, newAttendance.check_out, newAttendance.is_overnight_shift]);

  const isFormValid = !formErrors.checkInError && !formErrors.checkOutError && 
                      !formErrors.requiresOvernightFlag && newAttendance.employee_id;

  // Detect if overnight toggle should be shown for add form
  const showOvernightWarning = detectOvernightScenario(
    newAttendance.check_in,
    newAttendance.check_out
  ) && !newAttendance.is_overnight_shift;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Employee attendance tracking</p>
        </div>
        {(isAdmin || canCreateAttendance) && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsMarkAllDialogOpen(true)}>
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
              <DialogContent className="sm:max-w-md">
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
                    <EnhancedTimeInput
                      label="Check In"
                      value={newAttendance.check_in}
                      onChange={(v) => setNewAttendance({ ...newAttendance, check_in: v })}
                      error={formErrors.checkInError}
                      date={selectedDate}
                      validateFuture={true}
                    />
                    <EnhancedTimeInput
                      label="Check Out"
                      value={newAttendance.check_out}
                      onChange={(v) => setNewAttendance({ ...newAttendance, check_out: v })}
                      error={formErrors.checkOutError}
                      warning={showOvernightWarning ? "Enable overnight shift" : undefined}
                      date={selectedDate}
                    />
                  </div>

                  <OvernightShiftToggle
                    checked={newAttendance.is_overnight_shift}
                    onCheckedChange={(v) => setNewAttendance({ ...newAttendance, is_overnight_shift: v })}
                    showWarning={showOvernightWarning}
                  />

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
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="leave">On Leave</SelectItem>
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

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addLoading || !isFormValid}>
                      {addLoading ? "Adding..." : "Add Attendance"}
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
        {(isAdmin || isSuperAdmin) && (
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
        )}
      </div>

      {/* Weekly Holiday Alert */}
      {!holidaysLoading && selectedDate && isWeeklyHoliday(parseISO(selectedDate)) && (
        <Alert className="border-primary/50 bg-primary/5">
          <CalendarOff className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Weekly Off
            </Badge>
            <span>
              {format(parseISO(selectedDate), "EEEE, dd MMM yyyy")} is a weekly holiday. 
              No attendance required - this day counts as a paid day.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Attendance Table */}
      {loading ? (
        <AttendanceTableSkeleton rows={5} showActions={isAdmin} />
      ) : attendance.length === 0 ? (
        <div className="border rounded-lg p-8">
          <EmptyState
            icon={ClipboardList}
            title={isWeeklyHoliday(parseISO(selectedDate)) ? "Weekly Holiday" : "No attendance records"}
            description={
              isWeeklyHoliday(parseISO(selectedDate)) 
                ? `${format(parseISO(selectedDate), "EEEE")} is a weekly holiday. No attendance is required.`
                : "No attendance records found for the selected date"
            }
          />
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Employee</TableHead>
                <TableHead className="whitespace-nowrap">Check In</TableHead>
                <TableHead className="whitespace-nowrap">Check Out</TableHead>
                <TableHead className="whitespace-nowrap">Duration</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                {(isAdmin || canEditAttendance) && (
                  <TableHead className="whitespace-nowrap">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => {
                const checkInTime = extractTimeFromDateTime(record.check_in);
                const checkOutTime = extractTimeFromDateTime(record.check_out);
                const duration = checkInTime && checkOutTime 
                  ? calculateDuration(checkInTime, checkOutTime, record.is_overnight_shift || false)
                  : 0;
                const isUpdating = updatingRows.has(record.id);
                const rowError = rowErrors[record.id];
                const needsOvernightFlag = detectOvernightScenario(checkInTime, checkOutTime) && !record.is_overnight_shift;
                
                return (
                  <TableRow 
                    key={record.id} 
                    className={isUpdating ? 'opacity-50' : ''}
                  >
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(record.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {record.employee?.full_name || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(isAdmin || canEditAttendance) ? (
                        <div className="flex flex-col gap-1">
                          <TimeInput
                            value={checkInTime}
                            onChange={(val) => updateCheckIn(record.id, val, record.date)}
                            disabled={isUpdating}
                            showPicker={false}
                            showErrorText={false}
                            className="w-[160px] space-y-0"
                            placeholder="HH:MM"
                          />
                        </div>
                      ) : (
                        <span>{checkInTime || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(isAdmin || canEditAttendance) ? (
                        <div className="flex flex-col gap-1">
                          <TimeInput
                            value={checkOutTime}
                            onChange={(val) => updateCheckOut(record.id, val, record.date)}
                            disabled={isUpdating}
                            showPicker={false}
                            showErrorText={false}
                            className="w-[160px] space-y-0"
                            placeholder="HH:MM"
                          />
                        </div>
                      ) : (
                        <span>{checkOutTime || "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDuration(duration)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <AttendanceStatusBadge 
                          status={record.status} 
                          isOvernightShift={record.is_overnight_shift}
                          missingCheckOut={!!record.check_in && !record.check_out}
                        />
                        {rowError && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{rowError}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    {(isAdmin || canEditAttendance) && (
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Select
                            value={record.status}
                            onValueChange={(value) => updateStatus(record.id, value as AttendanceStatus)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                              <SelectItem value="half_day">Half Day</SelectItem>
                              <SelectItem value="holiday">Holiday</SelectItem>
                              <SelectItem value="leave">On Leave</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Overnight toggle for row */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant={record.is_overnight_shift ? "secondary" : "ghost"}
                                  size="icon"
                                  className={needsOvernightFlag ? "ring-2 ring-warning" : ""}
                                  onClick={() => toggleOvernightShift(record.id, !record.is_overnight_shift)}
                                  disabled={isUpdating}
                                >
                                  <Moon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{record.is_overnight_shift ? "Overnight shift enabled" : "Enable overnight shift"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Mark All Present Dialog */}
      <MarkAllPresentDialog
        open={isMarkAllDialogOpen}
        onOpenChange={setIsMarkAllDialogOpen}
        employees={employees}
        existingAttendance={attendance.map(a => a.employee_id)}
        selectedDate={selectedDate}
        onConfirm={handleMarkAllPresent}
        loading={markAllLoading}
      />
    </div>
  );
};

export default Attendance;
