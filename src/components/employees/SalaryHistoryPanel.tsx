import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface SalaryHistoryEntry {
  id: string;
  salary_amount: number;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

interface SalaryHistoryPanelProps {
  employeeId: string;
  currentSalary: number;
}

export const SalaryHistoryPanel = ({
  employeeId,
  currentSalary,
}: SalaryHistoryPanelProps) => {
  const { organization } = useOrganization();
  const [history, setHistory] = useState<SalaryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeId && organization?.id) {
      fetchSalaryHistory();
    }
  }, [employeeId, organization?.id]);

  const fetchSalaryHistory = async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_salary_history")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("organization_id", organization.id)
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching salary history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-3 w-3 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" />
          Salary History
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-4 w-4" />
          Salary History
        </div>
        <div className="text-sm text-muted-foreground py-4 text-center border rounded-md bg-muted/30">
          No salary history available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <History className="h-4 w-4" />
        Salary History ({history.length} record{history.length !== 1 ? "s" : ""})
      </div>
      <ScrollArea className="h-[160px] rounded-md border">
        <div className="p-2 space-y-2">
          {history.map((entry, index) => {
            const previousEntry = history[index + 1];
            const previousSalary = previousEntry?.salary_amount || 0;
            const changePercent = getChangePercentage(entry.salary_amount, previousSalary);

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {formatCurrency(entry.salary_amount)}
                    </span>
                    {previousEntry && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(entry.salary_amount, previousSalary)}
                        {changePercent && (
                          <span
                            className={`text-xs ${
                              entry.salary_amount > previousSalary
                                ? "text-green-600"
                                : entry.salary_amount < previousSalary
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {entry.salary_amount > previousSalary ? "+" : ""}
                            {changePercent}%
                          </span>
                        )}
                      </div>
                    )}
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs py-0">
                        Current
                      </Badge>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {entry.notes}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {format(new Date(entry.effective_date), "dd MMM yyyy")}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
