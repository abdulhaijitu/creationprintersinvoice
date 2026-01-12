import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Calendar, Palmtree, AlertTriangle } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  status?: 'available' | 'holiday' | 'leave';
}

interface MarkAllPresentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  existingAttendance: string[]; // Employee IDs already marked
  selectedDate: string;
  onConfirm: (employeeIds: string[]) => void;
  loading?: boolean;
}

export function MarkAllPresentDialog({
  open,
  onOpenChange,
  employees,
  existingAttendance,
  selectedDate,
  onConfirm,
  loading = false
}: MarkAllPresentDialogProps) {
  // Filter out employees already marked, on holiday, or on leave
  const availableEmployees = employees.filter(emp => {
    if (existingAttendance.includes(emp.id)) return false;
    if (emp.status === 'holiday' || emp.status === 'leave') return false;
    return true;
  });
  
  const skippedEmployees = employees.filter(emp => 
    existingAttendance.includes(emp.id) || 
    emp.status === 'holiday' || 
    emp.status === 'leave'
  );
  
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(
    new Set(availableEmployees.map(e => e.id))
  );
  
  const handleToggleEmployee = (empId: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };
  
  const handleSelectAll = () => {
    if (selectedEmployees.size === availableEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(availableEmployees.map(e => e.id)));
    }
  };
  
  const handleConfirm = () => {
    onConfirm(Array.from(selectedEmployees));
    onOpenChange(false);
  };
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Mark All Present
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Mark selected employees as <strong>Present</strong> for{" "}
                <span className="font-medium">{formatDate(selectedDate)}</span>
              </p>
              
              {skippedEmployees.length > 0 && (
                <div className="rounded-md bg-muted p-3 space-y-2">
                  <p className="font-medium text-foreground flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Skipped Employees ({skippedEmployees.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {skippedEmployees.slice(0, 5).map(emp => (
                      <Badge key={emp.id} variant="outline" className="text-xs">
                        {emp.full_name}
                        {emp.status === 'holiday' && (
                          <Calendar className="h-3 w-3 ml-1" />
                        )}
                        {emp.status === 'leave' && (
                          <Palmtree className="h-3 w-3 ml-1" />
                        )}
                        {existingAttendance.includes(emp.id) && ' (marked)'}
                      </Badge>
                    ))}
                    {skippedEmployees.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{skippedEmployees.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {availableEmployees.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Employees to Mark ({selectedEmployees.size} selected)
              </Label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedEmployees.size === availableEmployees.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="space-y-2">
                {availableEmployees.map(emp => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleEmployee(emp.id)}
                  >
                    <Checkbox
                      checked={selectedEmployees.has(emp.id)}
                      onCheckedChange={() => handleToggleEmployee(emp.id)}
                    />
                    <span className="text-sm">{emp.full_name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="rounded-md bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              All employees are already marked or on leave/holiday.
            </p>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || selectedEmployees.size === 0}
            className="gap-2"
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Users className="h-4 w-4" />
                Mark {selectedEmployees.size} Present
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default MarkAllPresentDialog;
