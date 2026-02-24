import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgScopedQuery } from "@/hooks/useOrgScopedQuery";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
import { useWeeklyHolidays } from "@/hooks/useWeeklyHolidays";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, UserCheck, UserX, Users, Plus, ClipboardList, Moon, AlertTriangle, CalendarOff, ChevronDown, ChevronUp, BarChart3, CalendarDays, Grid3X3 } from "lucide-react";
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
import { MonthlyCalendarView } from "@/components/attendance/MonthlyCalendarView";
import { BulkAttendanceEntry } from "@/components/attendance/BulkAttendanceEntry";
import { AttendanceMobileCard } from "@/components/attendance/AttendanceMobileCard";
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
import { cn } from "@/lib/utils";

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

const statusRowBg: Record<AttendanceStatus, string> = {
  present: "bg-success/5",
  absent: "bg-destructive/5",
  late: "bg-warning/5",
  half_day: "",
  holiday: "bg-info/5",
  leave: "",
};

const Attendance = () => {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const { hasPermission } = useOrgRolePermissions();
  const { isWeeklyHoliday, getWeekdayLabel, loading: holidaysLoading } = useWeeklyHolidays();
  const isMobile = useIsMobile();
  
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
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
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
  
  const [updatingRows, setUpdatingRows] = useState<Set<string>>(new Set());
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
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("full_name");
      setEmployees(employeesData || []);

      let query = supabase
        .from("employee_attendance")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("date", selectedDate)
        .order("created_at", { ascending: false });

      if (!isAdmin && !isSuperAdmin) {
        if (currentUserEmployeeId) {
          query = query.eq("employee_id", currentUserEmployeeId);
        } else {
          setAttendance([]);
          setLoading(false);
          return;
        }
      } else if (selectedEmployee !== "all") {
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

    if (!validateFormTimes()) return;

    setAddLoading(true);
    try {
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

      const checkInTimestamp = combineAttendanceDateTime(selectedDate, newAttendance.check_in, false, false);
      const checkOutTimestamp = combineAttendanceDateTime(selectedDate, newAttendance.check_out, true, newAttendance.is_overnight_shift);
      const autoStatus = calculateAttendanceStatus(newAttendance.check_in, DEFAULT_ATTENDANCE_SETTINGS);

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
      setAttendance(prev => prev.map(record => record.id === id ? { ...record, status } : record));
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      fetchData();
    } finally {
      setUpdatingRows(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const updateCheckIn = async (id: string, time: string, recordDate: string) => {
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) { setRowErrors(prev => ({ ...prev, [id]: "Invalid time format" })); return; }
      const record = attendance.find(r => r.id === id);
      if (record?.check_out) {
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        const validation = validateAttendanceTimesEnhanced(normalized, checkOutTime, record.is_overnight_shift || false);
        if (!validation.isValid) {
          setRowErrors(prev => ({ ...prev, [id]: validation.checkInError || validation.checkOutError || "Invalid time" }));
          return;
        }
      }
    }
    setRowErrors(prev => ({ ...prev, [id]: null }));
    setUpdatingRows(prev => new Set(prev).add(id));
    try {
      const timestamp = time ? combineAttendanceDateTime(recordDate, time, false, false) : null;
      const autoStatus = time ? calculateAttendanceStatus(time, DEFAULT_ATTENDANCE_SETTINGS) : 'absent';
      const { error } = await supabase.from("employee_attendance").update({ check_in: timestamp, status: autoStatus }).eq("id", id);
      if (error) throw error;
      setAttendance(prev => prev.map(record => record.id === id ? { ...record, check_in: timestamp, status: autoStatus } : record));
    } catch (error) {
      console.error("Error updating check-in:", error);
      toast.error("Failed to update check-in time");
      fetchData();
    } finally {
      setUpdatingRows(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const updateCheckOut = async (id: string, time: string, recordDate: string) => {
    const record = attendance.find(r => r.id === id);
    if (time) {
      const normalized = normalizeToTime24(time);
      if (!normalized) { setRowErrors(prev => ({ ...prev, [id]: "Invalid time format" })); return; }
      if (record?.check_in) {
        const checkInTime = extractTimeFromDateTime(record.check_in);
        const validation = validateAttendanceTimesEnhanced(checkInTime, normalized, record.is_overnight_shift || false);
        if (!validation.isValid) {
          setRowErrors(prev => ({ ...prev, [id]: validation.requiresOvernightFlag ? "Enable overnight shift for next-day check-out" : (validation.checkOutError || "Invalid time") }));
          return;
        }
      }
    }
    setRowErrors(prev => ({ ...prev, [id]: null }));
    setUpdatingRows(prev => new Set(prev).add(id));
    try {
      const timestamp = time ? combineAttendanceDateTime(recordDate, time, true, record?.is_overnight_shift || false) : null;
      const { error } = await supabase.from("employee_attendance").update({ check_out: timestamp }).eq("id", id);
      if (error) throw error;
      setAttendance(prev => prev.map(r => r.id === id ? { ...r, check_out: timestamp } : r));
    } catch (error) {
      console.error("Error updating check-out:", error);
      toast.error("Failed to update check-out time");
      fetchData();
    } finally {
      setUpdatingRows(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const toggleOvernightShift = async (id: string, isOvernight: boolean) => {
    setUpdatingRows(prev => new Set(prev).add(id));
    try {
      const record = attendance.find(r => r.id === id);
      if (!record) return;
      let newCheckOut = record.check_out;
      if (record.check_out && record.check_in) {
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        newCheckOut = combineAttendanceDateTime(record.date, checkOutTime, true, isOvernight);
      }
      const { error } = await supabase.from("employee_attendance").update({ is_overnight_shift: isOvernight, check_out: newCheckOut }).eq("id", id);
      if (error) throw error;
      setAttendance(prev => prev.map(r => r.id === id ? { ...r, is_overnight_shift: isOvernight, check_out: newCheckOut } : r));
      setRowErrors(prev => ({ ...prev, [id]: null }));
    } catch (error) {
      console.error("Error updating overnight shift:", error);
      toast.error("Failed to update overnight shift");
      fetchData();
    } finally {
      setUpdatingRows(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleMarkAllPresent = async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return;
    setMarkAllLoading(true);
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const checkInTimestamp = combineAttendanceDateTime(selectedDate, currentTime, false, false);
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
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  useEffect(() => {
    if (newAttendance.check_in || newAttendance.check_out) {
      const validation = validateAttendanceTimesEnhanced(newAttendance.check_in, newAttendance.check_out, newAttendance.is_overnight_shift);
      setFormErrors({ checkInError: validation.checkInError, checkOutError: validation.checkOutError, requiresOvernightFlag: validation.requiresOvernightFlag });
    }
  }, [newAttendance.check_in, newAttendance.check_out, newAttendance.is_overnight_shift]);

  const isFormValid = !formErrors.checkInError && !formErrors.checkOutError && !formErrors.requiresOvernightFlag && newAttendance.employee_id;
  const showOvernightWarning = detectOvernightScenario(newAttendance.check_in, newAttendance.check_out) && !newAttendance.is_overnight_shift;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
              {attendance.length > 0 && (
                <Badge variant={attendanceRate >= 80 ? "success" : attendanceRate >= 50 ? "warning" : "destructive"} size="sm">
                  {attendanceRate}%
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(selectedDate), "EEEE, dd MMM yyyy")}
            </p>
          </div>
        </div>
        {(isAdmin || canCreateAttendance) && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsMarkAllDialogOpen(true)}>
              <UserCheck className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Mark All Present</span>
              <span className="sm:hidden">Mark All</span>
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Attendance</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddAttendance} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={newAttendance.employee_id} onValueChange={(v) => setNewAttendance({ ...newAttendance, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <EnhancedTimeInput label="Check In" value={newAttendance.check_in} onChange={(v) => setNewAttendance({ ...newAttendance, check_in: v })} error={formErrors.checkInError} date={selectedDate} validateFuture={true} />
                    <EnhancedTimeInput label="Check Out" value={newAttendance.check_out} onChange={(v) => setNewAttendance({ ...newAttendance, check_out: v })} error={formErrors.checkOutError} warning={showOvernightWarning ? "Enable overnight shift" : undefined} date={selectedDate} />
                  </div>
                  <OvernightShiftToggle checked={newAttendance.is_overnight_shift} onCheckedChange={(v) => setNewAttendance({ ...newAttendance, is_overnight_shift: v })} showWarning={showOvernightWarning} />
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newAttendance.status} onValueChange={(v) => setNewAttendance({ ...newAttendance, status: v as AttendanceStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input value={newAttendance.notes} onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })} placeholder="Optional notes" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={addLoading || !isFormValid}>{addLoading ? "Adding..." : "Add Attendance"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Collapsible Summary Cards */}
      <Collapsible open={showStats} onOpenChange={setShowStats}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <BarChart3 className="h-4 w-4" />
            {showStats ? "Hide Stats" : "Show Stats"}
            {showStats ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card hoverable>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{attendance.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card hoverable>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="text-2xl font-bold text-success">{presentCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card hoverable>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <UserX className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card hoverable>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="text-2xl font-bold text-warning">{lateCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Daily</span>
            {attendance.length > 0 && (
              <Badge variant="secondary" size="sm" className="ml-1">{attendance.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          {(isAdmin || canCreateAttendance) && (
            <TabsTrigger value="bulk" className="gap-1.5">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Entry</span>
              {employees.length > 0 && (
                <Badge variant="muted" size="sm" className="ml-1">{employees.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Daily Tab */}
        <TabsContent value="daily" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[180px]" />
                </div>
                {(isAdmin || isSuperAdmin) && (
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map((emp) => (<SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )}
                {selectedEmployee !== "all" && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee("all")} className="text-muted-foreground">
                    Clear filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Holiday Alert */}
          {!holidaysLoading && selectedDate && isWeeklyHoliday(parseISO(selectedDate)) && (
            <Alert className="border-primary/50 bg-primary/5">
              <CalendarOff className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Weekly Off</Badge>
                <span>{format(parseISO(selectedDate), "EEEE, dd MMM yyyy")} is a weekly holiday.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Attendance Table / Cards */}
          {loading ? (
            <AttendanceTableSkeleton rows={5} showActions={isAdmin} />
          ) : attendance.length === 0 ? (
            <Card>
              <CardContent className="p-8">
                <EmptyState
                  icon={isWeeklyHoliday(parseISO(selectedDate)) ? CalendarOff : ClipboardList}
                  title={isWeeklyHoliday(parseISO(selectedDate)) ? "Weekly Holiday" : "No attendance records"}
                  description={isWeeklyHoliday(parseISO(selectedDate)) ? `${format(parseISO(selectedDate), "EEEE")} is a weekly holiday.` : "No attendance records found for the selected date"}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden">
                <AttendanceMobileCard
                  records={attendance}
                  canEdit={isAdmin || canEditAttendance}
                  updatingRows={updatingRows}
                  rowErrors={rowErrors}
                  onUpdateCheckIn={updateCheckIn}
                  onUpdateCheckOut={updateCheckOut}
                  onUpdateStatus={updateStatus}
                  onToggleOvernight={toggleOvernightShift}
                />
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap w-[40px]">#</TableHead>
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
                      {attendance.map((record, index) => {
                        const checkInTime = extractTimeFromDateTime(record.check_in);
                        const checkOutTime = extractTimeFromDateTime(record.check_out);
                        const duration = checkInTime && checkOutTime ? calculateDuration(checkInTime, checkOutTime, record.is_overnight_shift || false) : 0;
                        const isUpdating = updatingRows.has(record.id);
                        const rowError = rowErrors[record.id];
                        const needsOvernightFlag = detectOvernightScenario(checkInTime, checkOutTime) && !record.is_overnight_shift;

                        return (
                          <TableRow key={record.id} className={cn(isUpdating ? 'opacity-50' : '', statusRowBg[record.status])}>
                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{index + 1}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{record.employee?.full_name || "-"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {(isAdmin || canEditAttendance) ? (
                                <TimeInput value={checkInTime} onChange={(val) => updateCheckIn(record.id, val, record.date)} disabled={isUpdating} showPicker={false} showErrorText={false} className="w-[160px] space-y-0" placeholder="HH:MM" />
                              ) : (
                                <span>{checkInTime || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {(isAdmin || canEditAttendance) ? (
                                <TimeInput value={checkOutTime} onChange={(val) => updateCheckOut(record.id, val, record.date)} disabled={isUpdating} showPicker={false} showErrorText={false} className="w-[160px] space-y-0" placeholder="HH:MM" />
                              ) : (
                                <span>{checkOutTime || "-"}</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(duration)}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <AttendanceStatusBadge status={record.status} isOvernightShift={record.is_overnight_shift} missingCheckOut={!!record.check_in && !record.check_out} />
                                {rowError && (
                                  <TooltipProvider><Tooltip><TooltipTrigger><AlertTriangle className="h-4 w-4 text-warning" /></TooltipTrigger><TooltipContent><p>{rowError}</p></TooltipContent></Tooltip></TooltipProvider>
                                )}
                              </div>
                            </TableCell>
                            {(isAdmin || canEditAttendance) && (
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Select value={record.status} onValueChange={(value) => updateStatus(record.id, value as AttendanceStatus)} disabled={isUpdating}>
                                    <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">Present</SelectItem>
                                      <SelectItem value="absent">Absent</SelectItem>
                                      <SelectItem value="late">Late</SelectItem>
                                      <SelectItem value="half_day">Half Day</SelectItem>
                                      <SelectItem value="holiday">Holiday</SelectItem>
                                      <SelectItem value="leave">On Leave</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant={record.is_overnight_shift ? "secondary" : "ghost"} size="icon" className={needsOvernightFlag ? "ring-2 ring-warning" : ""} onClick={() => toggleOvernightShift(record.id, !record.is_overnight_shift)} disabled={isUpdating}>
                                          <Moon className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{record.is_overnight_shift ? "Overnight shift enabled" : "Enable overnight shift"}</p></TooltipContent>
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
            </>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          {organizationId && (
            <MonthlyCalendarView organizationId={organizationId} employees={employees} />
          )}
        </TabsContent>

        {/* Bulk Entry Tab */}
        {(isAdmin || canCreateAttendance) && (
          <TabsContent value="bulk">
            {organizationId && (
              <BulkAttendanceEntry
                organizationId={organizationId}
                employees={employees}
                selectedDate={selectedDate}
                onSaved={fetchData}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

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
