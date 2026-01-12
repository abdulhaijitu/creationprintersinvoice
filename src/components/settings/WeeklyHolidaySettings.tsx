import { useRef } from 'react';
import { useWeeklyHolidays, WEEKDAYS } from '@/hooks/useWeeklyHolidays';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface WeeklyHolidaySettingsProps {
  isReadOnly?: boolean;
}

export const WeeklyHolidaySettings = ({ isReadOnly = false }: WeeklyHolidaySettingsProps) => {
  const { 
    loading, 
    saving, 
    isDayHoliday, 
    toggleHoliday,
    getHolidayDays,
  } = useWeeklyHolidays();

  // Prevent double-click / fast repeated clicks from toggling twice before `saving` state updates
  const toggleLockRef = useRef(false);

  const handleToggle = async (dayOfWeek: number) => {
    if (isReadOnly || saving) return;
    if (toggleLockRef.current) return;

    toggleLockRef.current = true;
    try {
      const dayName = WEEKDAYS.find(w => w.value === dayOfWeek)?.label;

      // toggleHoliday returns { success, wasHoliday } so we get a stable previous state
      const result = await toggleHoliday(dayOfWeek);
      if (result.success) {
        toast.success(
          result.wasHoliday
            ? `${dayName} removed from weekly holidays`
            : `${dayName} set as weekly holiday`
        );
      } else {
        toast.error('Failed to update weekly holiday');
      }
    } finally {
      toggleLockRef.current = false;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeHolidays = getHolidayDays();

  // Modifier for highlighting weekly holidays in the calendar
  const holidayModifier = (date: Date) => {
    return activeHolidays.includes(date.getDay());
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <CardTitle>Weekly Holidays</CardTitle>
        </div>
        <CardDescription>
          Select which days of the week are holidays. These days will be marked as "Weekly Off" 
          in attendance and will not count as leave or absent days.
          {isReadOnly && ' (Read-only)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {WEEKDAYS.map((day) => {
            const isHoliday = isDayHoliday(day.value);
            return (
              <div
                key={day.value}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                  ${isHoliday 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/50'
                  }
                  ${isReadOnly ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
                  ${saving ? 'pointer-events-none opacity-50' : ''}
                `}
                onClick={() => !isReadOnly && !saving && handleToggle(day.value)}
              >
                <Checkbox
                  checked={isHoliday}
                  disabled={isReadOnly || saving}
                  className="pointer-events-none"
                />
                <span
                  className={`
                    text-sm font-medium select-none
                    ${isHoliday ? 'text-primary' : 'text-foreground'}
                  `}
                >
                  {day.short}
                </span>
                {isHoliday && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    Off
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Calendar Preview Section */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Calendar Preview</span>
          </div>
          <div className="flex justify-center bg-muted/30 rounded-lg p-4">
            <Calendar
              mode="single"
              modifiers={{ holiday: holidayModifier }}
              modifiersClassNames={{
                holiday: 'bg-destructive/20 text-destructive hover:bg-destructive/30 font-semibold'
              }}
              classNames={{
                day_today: 'bg-primary text-primary-foreground',
              }}
              showOutsideDays={false}
              className="rounded-md border bg-background"
            />
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/30" />
              <span>Weekly Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {activeHolidays.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Active weekly holidays:</span>
            <div className="flex flex-wrap gap-1">
              {activeHolidays.map(day => (
                <Badge key={day} variant="outline" className="text-xs">
                  {WEEKDAYS.find(w => w.value === day)?.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {activeHolidays.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No weekly holidays configured. All days of the week are working days.
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-primary/30 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong>How weekly holidays affect your system:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Attendance: Days marked as "Weekly Off" - no check-in required</li>
              <li>Leave: Cannot apply for leave on weekly holidays</li>
              <li>Salary: Weekly holidays count as paid days (no deduction)</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
