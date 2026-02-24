import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceStatusBadge } from "@/components/attendance/AttendanceStatusBadge";
import { TimeInput } from "@/components/attendance/TimeInput";
import { OvernightShiftToggle } from "@/components/attendance/OvernightShiftToggle";
import { extractTimeFromDateTime } from "@/lib/timeUtils";
import { calculateDuration, formatDuration, detectOvernightScenario } from "@/lib/attendanceValidation";
import { Clock, LogIn, LogOut, Moon, AlertTriangle, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

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

interface AttendanceMobileCardProps {
  records: AttendanceRecord[];
  canEdit: boolean;
  updatingRows: Set<string>;
  rowErrors: Record<string, string | null>;
  onUpdateCheckIn: (id: string, time: string, date: string) => void;
  onUpdateCheckOut: (id: string, time: string, date: string) => void;
  onUpdateStatus: (id: string, status: AttendanceStatus) => void;
  onToggleOvernight: (id: string, isOvernight: boolean) => void;
}

const statusRowColors: Record<AttendanceStatus, string> = {
  present: "border-l-success",
  absent: "border-l-destructive",
  late: "border-l-warning",
  half_day: "border-l-accent-foreground",
  holiday: "border-l-info",
  leave: "border-l-secondary-foreground",
};

export function AttendanceMobileCard({
  records,
  canEdit,
  updatingRows,
  rowErrors,
  onUpdateCheckIn,
  onUpdateCheckOut,
  onUpdateStatus,
  onToggleOvernight,
}: AttendanceMobileCardProps) {
  return (
    <div className="space-y-3">
      {records.map((record) => {
        const checkInTime = extractTimeFromDateTime(record.check_in);
        const checkOutTime = extractTimeFromDateTime(record.check_out);
        const duration = checkInTime && checkOutTime
          ? calculateDuration(checkInTime, checkOutTime, record.is_overnight_shift || false)
          : 0;
        const isUpdating = updatingRows.has(record.id);
        const rowError = rowErrors[record.id];
        const needsOvernightFlag = detectOvernightScenario(checkInTime, checkOutTime) && !record.is_overnight_shift;

        return (
          <Card
            key={record.id}
            className={cn(
              "border-l-4 transition-opacity",
              statusRowColors[record.status] || "border-l-border",
              isUpdating && "opacity-50"
            )}
          >
            <CardContent className="p-4 space-y-3">
              {/* Header: Name + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-muted">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <span className="font-semibold text-sm">{record.employee?.full_name || "Unknown"}</span>
                </div>
                <AttendanceStatusBadge
                  status={record.status}
                  isOvernightShift={record.is_overnight_shift}
                  missingCheckOut={!!record.check_in && !record.check_out}
                />
              </div>

              {/* Time display / edit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <LogIn className="h-3 w-3" /> Check In
                  </span>
                  {canEdit ? (
                    <TimeInput
                      value={checkInTime}
                      onChange={(val) => onUpdateCheckIn(record.id, val, record.date)}
                      disabled={isUpdating}
                      showPicker={false}
                      showErrorText={false}
                      className="space-y-0"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <p className="text-sm font-medium">{checkInTime || "—"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <LogOut className="h-3 w-3" /> Check Out
                  </span>
                  {canEdit ? (
                    <TimeInput
                      value={checkOutTime}
                      onChange={(val) => onUpdateCheckOut(record.id, val, record.date)}
                      disabled={isUpdating}
                      showPicker={false}
                      showErrorText={false}
                      className="space-y-0"
                      placeholder="HH:MM"
                    />
                  ) : (
                    <p className="text-sm font-medium">{checkOutTime || "—"}</p>
                  )}
                </div>
              </div>

              {/* Duration + Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="muted" size="sm" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(duration)}
                  </Badge>
                  {rowError && (
                    <Badge variant="warning" size="sm" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {rowError}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Select
                      value={record.status}
                      onValueChange={(v) => onUpdateStatus(record.id, v as AttendanceStatus)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[100px] h-8 text-xs">
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
                    <Button
                      variant={record.is_overnight_shift ? "secondary" : "ghost"}
                      size="icon"
                      className={cn("h-8 w-8", needsOvernightFlag && "ring-2 ring-warning")}
                      onClick={() => onToggleOvernight(record.id, !record.is_overnight_shift)}
                      disabled={isUpdating}
                    >
                      <Moon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default AttendanceMobileCard;
