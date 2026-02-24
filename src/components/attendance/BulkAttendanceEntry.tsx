import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Copy, Save, Loader2, CheckCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TimeInput } from "@/components/attendance/TimeInput";
import { combineAttendanceDateTime, calculateAttendanceStatus, DEFAULT_ATTENDANCE_SETTINGS } from "@/lib/attendanceValidation";
import { extractTimeFromDateTime, normalizeToTime24, isValid24HourTime } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  full_name: string;
}

interface BulkAttendanceEntryProps {
  organizationId: string;
  employees: Employee[];
  selectedDate: string;
  onSaved: () => void;
}

interface BulkRow {
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  existingId: string | null;
  hasExisting: boolean;
}

export function BulkAttendanceEntry({ organizationId, employees, selectedDate, onSaved }: BulkAttendanceEntryProps) {
  const [saving, setSaving] = useState(false);
  const [applyCheckIn, setApplyCheckIn] = useState("");
  const [applyCheckOut, setApplyCheckOut] = useState("");

  // Fetch existing attendance for the date
  const { data: existingRecords = [], isLoading } = useQuery({
    queryKey: ["bulk-attendance", organizationId, selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_attendance")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("date", selectedDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Initialize rows
  const [rows, setRows] = useState<BulkRow[]>([]);

  useMemo(() => {
    const newRows = employees.map((emp) => {
      const existing = existingRecords.find((r) => r.employee_id === emp.id);
      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        checkIn: existing ? (extractTimeFromDateTime(existing.check_in) || "") : "",
        checkOut: existing ? (extractTimeFromDateTime(existing.check_out) || "") : "",
        existingId: existing?.id || null,
        hasExisting: !!existing,
      };
    });
    setRows(newRows);
  }, [employees, existingRecords]);

  const updateRow = (index: number, field: "checkIn" | "checkOut", value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const applyToAll = (field: "checkIn" | "checkOut") => {
    const value = field === "checkIn" ? applyCheckIn : applyCheckOut;
    if (!value) return;
    setRows((prev) => prev.map((row) => ({ ...row, [field]: value })));
    toast.success(`${field === "checkIn" ? "Check In" : "Check Out"} applied to all`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toUpsert: any[] = [];
      const toInsert: any[] = [];

      rows.forEach((row) => {
        if (!row.checkIn && !row.checkOut && !row.hasExisting) return; // Skip empty new rows

        const checkInTimestamp = row.checkIn ? combineAttendanceDateTime(selectedDate, row.checkIn, false, false) : null;
        const checkOutTimestamp = row.checkOut ? combineAttendanceDateTime(selectedDate, row.checkOut, true, false) : null;
        const autoStatus = row.checkIn ? calculateAttendanceStatus(row.checkIn, DEFAULT_ATTENDANCE_SETTINGS) : "absent";

        if (row.existingId) {
          toUpsert.push({
            id: row.existingId,
            employee_id: row.employeeId,
            date: selectedDate,
            check_in: checkInTimestamp,
            check_out: checkOutTimestamp,
            status: autoStatus,
            organization_id: organizationId,
          });
        } else if (row.checkIn || row.checkOut) {
          toInsert.push({
            employee_id: row.employeeId,
            date: selectedDate,
            check_in: checkInTimestamp,
            check_out: checkOutTimestamp,
            status: autoStatus,
            organization_id: organizationId,
          });
        }
      });

      if (toUpsert.length > 0) {
        const { error } = await supabase.from("employee_attendance").upsert(toUpsert, { onConflict: "id" });
        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("employee_attendance").insert(toInsert);
        if (error) throw error;
      }

      const total = toUpsert.length + toInsert.length;
      toast.success(`${total} attendance record(s) saved`);
      onSaved();
    } catch (error) {
      console.error("Error saving bulk attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const filledCount = rows.filter((r) => r.checkIn || r.checkOut).length;
  const existingCount = rows.filter((r) => r.hasExisting).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(selectedDate), "dd MMM yyyy")}
          </Badge>
          <Badge variant="muted">{employees.length} employees</Badge>
          {existingCount > 0 && (
            <Badge variant="info" className="gap-1">
              <Edit className="h-3 w-3" />
              {existingCount} existing
            </Badge>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || filledCount === 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save ({filledCount})
        </Button>
      </div>

      {/* Apply to all bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Check In</span>
                <TimeInput
                  value={applyCheckIn}
                  onChange={setApplyCheckIn}
                  placeholder="HH:MM"
                  showPicker={false}
                  showErrorText={false}
                  className="w-[140px] space-y-0"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => applyToAll("checkIn")} disabled={!applyCheckIn}>
                <Copy className="mr-1 h-3 w-3" /> Apply
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Check Out</span>
                <TimeInput
                  value={applyCheckOut}
                  onChange={setApplyCheckOut}
                  placeholder="HH:MM"
                  showPicker={false}
                  showErrorText={false}
                  className="w-[140px] space-y-0"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => applyToAll("checkOut")} disabled={!applyCheckOut}>
                <Copy className="mr-1 h-3 w-3" /> Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead className="w-[160px]">Check In</TableHead>
              <TableHead className="w-[160px]">Check Out</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={row.employeeId}
                className={cn(
                  row.hasExisting && "bg-info/5",
                  (row.checkIn || row.checkOut) && !row.hasExisting && "bg-success/5"
                )}
              >
                <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {row.employeeName}
                    {row.hasExisting && (
                      <Badge variant="muted" size="sm"><Edit className="h-2.5 w-2.5" /></Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <TimeInput
                    value={row.checkIn}
                    onChange={(v) => updateRow(index, "checkIn", v)}
                    placeholder="HH:MM"
                    showPicker={false}
                    showErrorText={false}
                    className="w-full space-y-0"
                  />
                </TableCell>
                <TableCell>
                  <TimeInput
                    value={row.checkOut}
                    onChange={(v) => updateRow(index, "checkOut", v)}
                    placeholder="HH:MM"
                    showPicker={false}
                    showErrorText={false}
                    className="w-full space-y-0"
                  />
                </TableCell>
                <TableCell>
                  {row.checkIn ? (
                    <Badge variant="success" size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {calculateAttendanceStatus(row.checkIn, DEFAULT_ATTENDANCE_SETTINGS) === "late" ? "Late" : "OK"}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default BulkAttendanceEntry;
