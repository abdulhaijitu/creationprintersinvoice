import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared";
import { ChevronLeft, ChevronRight, ListTodo, FileText, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_LABELS, type TaskStatus } from "@/components/tasks/ProductionWorkflow";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "task" | "invoice" | "leave" | "attendance";
  status?: string;
  meta?: string;
}

const eventTypeConfig = {
  task: { icon: ListTodo, color: "bg-primary/10 text-primary border-primary/20" },
  invoice: { icon: FileText, color: "bg-warning/10 text-warning border-warning/20" },
  leave: { icon: CalendarDays, color: "bg-info/10 text-info border-info/20" },
  attendance: { icon: Clock, color: "bg-success/10 text-success border-success/20" },
};

const CalendarView = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Fetch tasks with deadlines
  const { data: tasks = [] } = useQuery({
    queryKey: ["calendar-tasks", organization?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("tasks")
        .select("id, title, deadline, status")
        .eq("organization_id", organization.id)
        .not("deadline", "is", null)
        .gte("deadline", format(monthStart, "yyyy-MM-dd"))
        .lte("deadline", format(monthEnd, "yyyy-MM-dd"));
      return (data || []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.deadline!,
        type: "task" as const,
        status: t.status,
        meta: WORKFLOW_LABELS[t.status as TaskStatus] || t.status,
      }));
    },
    enabled: !!organization?.id,
  });

  // Fetch invoices with due dates
  const { data: invoices = [] } = useQuery({
    queryKey: ["calendar-invoices", organization?.id, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, due_date, status")
        .eq("organization_id", organization.id)
        .not("due_date", "is", null)
        .gte("due_date", format(monthStart, "yyyy-MM-dd"))
        .lte("due_date", format(monthEnd, "yyyy-MM-dd"));
      return (data || []).map((i) => ({
        id: i.id,
        title: `Invoice ${i.invoice_number}`,
        date: i.due_date!,
        type: "invoice" as const,
        status: i.status,
        meta: i.status,
      }));
    },
    enabled: !!organization?.id,
  });

  const allEvents: CalendarEvent[] = useMemo(() => [...tasks, ...invoices], [tasks, invoices]);

  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // Pad start of month to align with weekday grid
  const startDayOfWeek = monthStart.getDay(); // 0=Sun
  const paddedDays = useMemo(() => {
    const padding: (Date | null)[] = Array(startDayOfWeek).fill(null);
    return [...padding, ...days];
  }, [startDayOfWeek, days]);

  const getEventsForDay = (date: Date) => allEvents.filter((e) => isSameDay(new Date(e.date), date));

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title="Calendar" description="View tasks, invoices and events at a glance" />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {paddedDays.map((day, i) => {
                if (!day) {
                  return <div key={`pad-${i}`} className="bg-card min-h-[80px] sm:min-h-[100px]" />;
                }
                const dayEvents = getEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "bg-card min-h-[80px] sm:min-h-[100px] p-1.5 text-left transition-colors hover:bg-accent/50 focus:outline-none",
                      isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium",
                        today && "bg-primary text-primary-foreground",
                        !today && "text-foreground"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {/* Event dots */}
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt) => {
                        const config = eventTypeConfig[evt.type];
                        return (
                          <div
                            key={evt.id}
                            className={cn("text-[10px] leading-tight px-1 py-0.5 rounded truncate border", config.color)}
                          >
                            {evt.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Click a date to see events</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((evt) => {
                  const config = eventTypeConfig[evt.type];
                  const Icon = config.icon;
                  return (
                    <div key={evt.id} className={cn("flex items-start gap-2 p-2 rounded-md border", config.color)}>
                      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{evt.title}</p>
                        {evt.meta && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {evt.meta}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarView;
