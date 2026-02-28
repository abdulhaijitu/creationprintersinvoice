import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Receipt,
  Wallet,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileHomeTiles } from '@/components/layout/MobileHomeTiles';
import { useQuery } from '@tanstack/react-query';
import { queryKeys, STALE_TIMES } from '@/hooks/useQueryConfig';

interface DashboardStats {
  invoiceTotal: number;
  invoicePayments: number;
  invoiceDue: number;
  vendorBills: number;
  officeExpenses: number;
  salary: number;
  totalExpense: number;
  tasksActive: number;
  tasksDelivered: number;
  tasksArchived: number;
  companyName: string | null;
}

const fetchDashboardData = async (orgId: string): Promise<DashboardStats> => {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const [invoicesRes, expensesRes, vendorBillsRes, salaryRes, tasksRes, companySettingsRes] =
    await Promise.all([
      supabase
        .from('invoices')
        .select('total, paid_amount')
        .eq('organization_id', orgId)
        .gte('invoice_date', monthStartStr)
        .lte('invoice_date', monthEndStr),
      supabase
        .from('expenses')
        .select('amount, vendor_bill_id')
        .eq('organization_id', orgId)
        .gte('date', monthStartStr)
        .lte('date', monthEndStr),
      supabase
        .from('vendor_bills')
        .select('net_amount')
        .eq('organization_id', orgId)
        .gte('bill_date', monthStartStr)
        .lte('bill_date', monthEndStr),
      supabase
        .from('employee_salary_records')
        .select('net_payable')
        .eq('organization_id', orgId)
        .eq('year', currentYear)
        .eq('month', currentMonth),
      supabase.from('tasks').select('status').eq('organization_id', orgId),
      supabase.from('company_settings').select('company_name').limit(1).single(),
    ]);

  const invoices = invoicesRes.data || [];
  const invoiceTotal = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const invoicePayments = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const invoiceDue = invoiceTotal - invoicePayments;

  const expenses = expensesRes.data || [];
  const officeExpenses = expenses
    .filter((e) => !e.vendor_bill_id)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const vendorBills = (vendorBillsRes.data || []).reduce(
    (sum, b) => sum + Number(b.net_amount || 0), 0
  );
  const salary = (salaryRes.data || []).reduce(
    (sum, s) => sum + Number(s.net_payable || 0), 0
  );
  const totalExpense = vendorBills + officeExpenses + salary;

  const tasks = tasksRes.data || [];
  const activeStatuses = ['todo', 'in_progress', 'design', 'printing', 'packaging'];
  const tasksActive = tasks.filter((t) => activeStatuses.includes(t.status)).length;
  const tasksDelivered = tasks.filter((t) => t.status === 'delivered').length;
  const tasksArchived = tasks.filter((t) => t.status === 'archived').length;

  return {
    invoiceTotal,
    invoicePayments,
    invoiceDue,
    vendorBills,
    officeExpenses,
    salary,
    totalExpense,
    tasksActive,
    tasksDelivered,
    tasksArchived,
    companyName: companySettingsRes.data?.company_name || null,
  };
};

const Dashboard = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const orgId = organization?.id;

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: queryKeys.dashboardStats(orgId || ''),
    queryFn: () => fetchDashboardData(orgId!),
    enabled: !!orgId,
    staleTime: STALE_TIMES.DASHBOARD,
  });

  // Mobile: show tile navigation on "/" root
  if (isMobile && location.pathname === '/') {
    return <MobileHomeTiles />;
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6 w-full min-w-0 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight uppercase truncate">
            {stats.companyName}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 sm:h-10 shrink-0" onClick={() => navigate('/reports')}>
          <Receipt className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">View Reports</span>
          <span className="sm:hidden">Reports</span>
        </Button>
      </div>

      {/* 3 Dashboard Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Monthly Invoices */}
        <Card
          className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.99]"
          onClick={() => navigate('/invoices')}
        >
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-primary" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold">Monthly Invoices</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <MetricColumn label="Total" value={formatCurrency(stats.invoiceTotal)} colorClass="text-foreground" />
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Payments" value={formatCurrency(stats.invoicePayments)} colorClass="text-success" />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Due" value={formatCurrency(stats.invoiceDue)} colorClass={stats.invoiceDue > 0 ? 'text-destructive' : 'text-success'} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card
          className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-destructive/30 hover:-translate-y-0.5 active:scale-[0.99]"
          onClick={() => navigate('/expenses')}
        >
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Wallet className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-destructive" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold">Monthly Expenses</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <MetricColumn label="Vendor Bills" value={formatCurrency(stats.vendorBills)} colorClass="text-foreground" />
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Expense + Salary" value={formatCurrency(stats.officeExpenses + stats.salary)} colorClass="text-foreground" />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Total" value={formatCurrency(stats.totalExpense)} colorClass="text-destructive" bold />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Tasks */}
        <Card
          className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-info/30 hover:-translate-y-0.5 active:scale-[0.99]"
          onClick={() => navigate('/tasks')}
        >
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-info/10">
                  <ClipboardList className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-info" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold">Production Tasks</h3>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <MetricColumn label="Active" value={String(stats.tasksActive)} colorClass="text-primary" />
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Delivered" value={String(stats.tasksDelivered)} colorClass="text-success" />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <Separator orientation="vertical" className="h-auto" />
                <MetricColumn label="Archived" value={String(stats.tasksArchived)} colorClass="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface MetricColumnProps {
  label: string;
  value: string;
  colorClass: string;
  bold?: boolean;
}

const MetricColumn = ({ label, value, colorClass, bold }: MetricColumnProps) => (
  <div className="min-w-0">
    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
      {label}
    </p>
    <p className={cn(
      "text-sm sm:text-base md:text-lg font-semibold tabular-nums tracking-tight truncate",
      bold && "font-bold",
      colorClass
    )}>
      {value}
    </p>
  </div>
);

export default Dashboard;
