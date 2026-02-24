import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useWeeklyHolidays } from "@/hooks/useWeeklyHolidays";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar, Users, UserCheck, UserX, Clock, TrendingUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday, isFuture } from "date-fns";
import { extractTimeFromDateTime } from "@/lib/timeUtils";
import { calculateDuration, formatDuration } from "@/lib/attendanceValidation";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

interface Employee {
  id: string;
  full_name: string;
}

interface MonthlyCalendarViewProps {
  organizationId: string;
  employees: Employee[];
}

const statusColors: Record<AttendanceStatus, string> = {
  present: "bg-success/20 text-success border-success/30",
  absent: "bg-destructive/20 text-destructive border-destructive/30",
  late: "bg-warning/20 text-warning border-warning/30",
  half_day: "bg-accent text-accent-foreground border-accent",
  holiday: "bg-info/20 text-info border-info/30",
  leave: "bg-secondary text-secondary-foreground border-border",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  late: "L",
  half_day: "½",
  holiday: "H",
  leave: "LV",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthlyCalendarView({ organizationId, employees }: MonthlyCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const { isWeeklyHoliday } = useWeeklyHolidays();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: monthlyData = [], isLoading } = useQuery({
    queryKey: ["monthly-attendance", organizationId, format(monthStart, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd"), selectedEmployeeId],
    queryFn: async () => {
      let query = supabase
        .from("employee_attendance")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (selectedEmployeeId !== "all") {
        query = query.eq("employee_id", selectedEmployeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Group data by date
  const dataByDate = useMemo(() => {
    const map: Record<string, typeof monthlyData> = {};
    monthlyData.forEach((record) => {
      if (!map[record.date]) map[record.date] = [];
      map[record.date].push(record);
    });
    return map;
  }, [monthlyData]);

  // Calendar grid
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Summary stats
  const summary = useMemo(() => {
    let present = 0, absent = 0, late = 0, halfDay = 0, totalMinutes = 0;
    monthlyData.forEach((r) => {
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "late") late++;
      else if (r.status === "half_day") halfDay++;

      const checkIn = extractTimeFromDateTime(r.check_in);
      const checkOut = extractTimeFromDateTime(r.check_out);
      if (checkIn && checkOut) {
        totalMinutes += calculateDuration(checkIn, checkOut, r.is_overnight_shift || false);
      }
    });
    return { present, absent, late, halfDay, totalMinutes, total: monthlyData.length };
  }, [monthlyData]);

  const getDominantStatus = (records: typeof monthlyData): AttendanceStatus | null => {
    if (!records || records.length === 0) return null;
    if (selectedEmployeeId !== "all" && records.length === 1) return records[0].status;
    // For "all" mode, pick the most common status
    const counts: Record<string, number> = {};
    records.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as AttendanceStatus;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card hoverable>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card hoverable>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><UserCheck className="h-4 w-4 text-success" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-lg font-bold text-success">{summary.present}</p>
            </div>
          </CardContent>
        </Card>
        <Card hoverable>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><UserX className="h-4 w-4 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-lg font-bold text-destructive">{summary.absent}</p>
            </div>
          </CardContent>
        </Card>
        <Card hoverable>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10"><Clock className="h-4 w-4 text-warning" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Late</p>
              <p className="text-lg font-bold text-warning">{summary.late}</p>
            </div>
          </CardContent>
        </Card>
        <Card hoverable>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10"><TrendingUp className="h-4 w-4 text-info" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-lg font-bold">{formatDuration(summary.totalMinutes)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 md:p-4">
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-md bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Weekday headers */}
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {/* Empty cells before first day */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {/* Day cells */}
              {daysInMonth.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const records = dataByDate[dateStr] || [];
                const dominant = getDominantStatus(records);
                const holiday = isWeeklyHoliday(day);
                const future = isFuture(day);
                const today = isToday(day);

                return (
                  <TooltipProvider key={dateStr}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "aspect-square rounded-md border flex flex-col items-center justify-center gap-0.5 text-xs transition-colors cursor-default",
                            today && "ring-2 ring-primary",
                            future && "opacity-40",
                            holiday && !dominant && "bg-info/5 border-info/20",
                            dominant && statusColors[dominant],
                            !dominant && !holiday && !future && "border-border bg-card"
                          )}
                        >
                          <span className={cn("font-medium", today && "text-primary")}>{format(day, "d")}</span>
                          {dominant && (
                            <span className="text-[10px] font-bold leading-none">{statusLabels[dominant]}</span>
                          )}
                          {holiday && !dominant && (
                            <span className="text-[10px] font-bold text-info leading-none">H</span>
                          )}
                          {records.length > 1 && (
                            <span className="text-[9px] text-muted-foreground">{records.length}</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{format(day, "EEEE, dd MMM yyyy")}</p>
                          {holiday && <p className="text-xs text-info">Weekly Holiday</p>}
                          {records.length === 0 && !holiday && !future && (
                            <p className="text-xs text-muted-foreground">No records</p>
                          )}
                          {records.map((r, i) => {
                            const emp = employees.find((e) => e.id === r.employee_id);
                            const checkIn = extractTimeFromDateTime(r.check_in);
                            const checkOut = extractTimeFromDateTime(r.check_out);
                            return (
                              <div key={i} className="text-xs">
                                <span className="font-medium">{emp?.full_name || "Unknown"}</span>
                                {" - "}
                                <span className="capitalize">{r.status}</span>
                                {checkIn && <span> | In: {checkIn}</span>}
                                {checkOut && <span> | Out: {checkOut}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {(Object.entries(statusLabels) as [AttendanceStatus, string][]).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn("w-4 h-4 rounded border text-center text-[10px] font-bold flex items-center justify-center", statusColors[status])}>
              {label}
            </div>
            <span className="capitalize text-muted-foreground">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonthlyCalendarView;
