import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard, MiniStat } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  FileText,
  FileCheck,
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Receipt,
  Building2,
  CalendarDays,
  ListTodo,
  UserCheck,
  AlertTriangle,
  DollarSign,
  CreditCard,
  ChevronRight,
  Briefcase,
  Palette,
  Printer,
  Package,
  Truck,
  ClipboardList,
  Banknote,
  XCircle,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns';
import { formatCurrency, formatChartCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileHomeTiles } from '@/components/layout/MobileHomeTiles';

interface DashboardStats {
  todaySales: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  netProfit: number;
  customerDue: number;
  vendorPayable: number;
  pendingInvoices: number;
  overdueInvoices: number;
  paidInvoices: number;
  // Quotation stats by status
  quotationsDraft: number;
  quotationsSent: number;
  quotationsAccepted: number;
  quotationsRejected: number;
  quotationsConverted: number;
  quotationsExpired: number;
  quotationsTotal: number;
  // Delivery Challan stats by status
  challansDraft: number;
  challansDispatched: number;
  challansDelivered: number;
  challansCancelled: number;
  challansTotal: number;
  totalCustomers: number;
  totalEmployees: number;
  todayAttendance: number;
  pendingLeaves: number;
  tasksInProgress: number;
  tasksDueToday: number;
  // Previous month for comparison
  lastMonthRevenue: number;
  lastMonthExpense: number;
  // Invoice totals
  totalInvoiceAmount: number;
  totalDueAmount: number;
  // Task status counts
  tasksActive: number;
  tasksInDesign: number;
  tasksPrinting: number;
  tasksPackaging: number;
  tasksDelivered: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info))',
  muted: 'hsl(var(--muted-foreground))',
};

const PIE_COLORS = [
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--info))',
  'hsl(var(--primary))',
];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthlyRevenue: 0,
    monthlyExpense: 0,
    netProfit: 0,
    customerDue: 0,
    vendorPayable: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    paidInvoices: 0,
    quotationsDraft: 0,
    quotationsSent: 0,
    quotationsAccepted: 0,
    quotationsRejected: 0,
    quotationsConverted: 0,
    quotationsExpired: 0,
    quotationsTotal: 0,
    challansDraft: 0,
    challansDispatched: 0,
    challansDelivered: 0,
    challansCancelled: 0,
    challansTotal: 0,
    totalCustomers: 0,
    totalEmployees: 0,
    todayAttendance: 0,
    pendingLeaves: 0,
    tasksInProgress: 0,
    tasksDueToday: 0,
    lastMonthRevenue: 0,
    lastMonthExpense: 0,
    totalInvoiceAmount: 0,
    totalDueAmount: 0,
    tasksActive: 0,
    tasksInDesign: 0,
    tasksPrinting: 0,
    tasksPackaging: 0,
    tasksDelivered: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [alerts, setAlerts] = useState<{ type: string; message: string; count: number; href: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch data without organization context
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const orgId = organization.id;
        const today = new Date();
        const monthStart = startOfMonth(today);
        const lastMonth = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        const todayStr = format(today, 'yyyy-MM-dd');
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');
        const lastMonthStartStr = format(lastMonthStart, 'yyyy-MM-dd');
        const lastMonthEndStr = format(lastMonthEnd, 'yyyy-MM-dd');

        // Get last 6 months for trend data
        const sixMonthsAgo = subMonths(today, 5);
        const sixMonthsAgoStr = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd');

        // Fetch all data in parallel - ALL queries MUST be scoped to organization_id
        const [
          invoicesRes,
          quotationsRes,
          customersRes,
          expensesRes,
          recentInvoicesRes,
          vendorBillsRes,
          employeesRes,
          attendanceRes,
          leaveRequestsRes,
          tasksRes,
          allExpensesRes,
          expenseCategoriesRes,
          lastMonthExpensesRes,
          lastMonthInvoicesRes,
          companySettingsRes,
          deliveryChallansRes,
        ] = await Promise.all([
          supabase.from('invoices').select('total, paid_amount, status, invoice_date, due_date').eq('organization_id', orgId),
          supabase.from('quotations').select('status').eq('organization_id', orgId),
          supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          supabase.from('expenses').select('amount').eq('organization_id', orgId).gte('date', monthStartStr),
          supabase
            .from('invoices')
            .select('*, customers(name)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('vendor_bills').select('amount, status').eq('organization_id', orgId).neq('status', 'paid'),
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('is_active', true),
          supabase.from('employee_attendance').select('id').eq('organization_id', orgId).eq('date', todayStr).eq('status', 'present'),
          isAdmin
            ? supabase.from('leave_requests').select('id').eq('organization_id', orgId).eq('status', 'pending')
            : Promise.resolve({ data: [], count: 0 }),
          supabase.from('tasks').select('id, status, deadline').eq('organization_id', orgId),
          supabase.from('expenses').select('amount, date').eq('organization_id', orgId).gte('date', sixMonthsAgoStr),
          supabase
            .from('expenses')
            .select('amount, expense_categories(name)')
            .eq('organization_id', orgId)
            .gte('date', monthStartStr),
          supabase
            .from('expenses')
            .select('amount')
            .eq('organization_id', orgId)
            .gte('date', lastMonthStartStr)
            .lte('date', lastMonthEndStr),
          supabase
            .from('invoices')
            .select('paid_amount')
            .eq('organization_id', orgId)
            .gte('invoice_date', lastMonthStartStr)
            .lte('invoice_date', lastMonthEndStr),
          supabase.from('company_settings').select('company_name').limit(1).single(),
          supabase.from('delivery_challans').select('status').eq('organization_id', orgId),
        ]);

        // Calculate stats
        const invoices = invoicesRes.data || [];
        const todayInvoices = invoices.filter((inv) => inv.invoice_date === todayStr);
        const monthlyInvoices = invoices.filter((inv) => inv.invoice_date >= monthStartStr);

        const todaySales = todayInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
        const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
        const monthlyExpense = (expensesRes.data || []).reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const netProfit = monthlyRevenue - monthlyExpense;
        
        const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
        const pendingInvoices = invoices.filter((inv) => inv.status === 'unpaid' || inv.status === 'partial').length;
        const overdueInvoices = invoices.filter((inv) => {
          if (inv.status === 'paid') return false;
          if (!inv.due_date) return false;
          return parseISO(inv.due_date) < today;
        }).length;

        const customerDue = invoices.reduce(
          (sum, inv) => sum + (Number(inv.total || 0) - Number(inv.paid_amount || 0)),
          0
        );

        const vendorPayable = (vendorBillsRes.data || []).reduce(
          (sum, bill) => sum + Number(bill.amount || 0),
          0
        );

        // Last month stats for comparison
        const lastMonthRevenue = (lastMonthInvoicesRes.data || []).reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const lastMonthExpense = (lastMonthExpensesRes.data || []).reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0
        );

        // Tasks - calculate counts by status
        const tasks = tasksRes.data || [];
        const tasksInProgress = tasks.filter((t) => t.status !== 'completed' && t.status !== 'delivered' && t.status !== 'archived').length;
        const tasksDueToday = tasks.filter((t) => t.deadline && t.deadline === todayStr && t.status !== 'completed').length;
        
        // Task status counts for dashboard cards
        const tasksActive = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
        const tasksInDesign = tasks.filter((t) => t.status === 'design').length;
        const tasksPrinting = tasks.filter((t) => t.status === 'printing').length;
        const tasksPackaging = tasks.filter((t) => t.status === 'packaging').length;
        const tasksDelivered = tasks.filter((t) => t.status === 'delivered').length;
        
        // Invoice totals
        const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const totalDueAmount = invoices.reduce(
          (sum, inv) => sum + (Number(inv.total || 0) - Number(inv.paid_amount || 0)),
          0
        );

        // Calculate monthly trend for last 6 months
        const allExpenses = allExpensesRes.data || [];
        const monthlyData: MonthlyData[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(today, i);
          const monthStartDate = startOfMonth(monthDate);
          const monthEndDate = endOfMonth(monthDate);
          const monthStartFormatted = format(monthStartDate, 'yyyy-MM-dd');
          const monthEndFormatted = format(monthEndDate, 'yyyy-MM-dd');

          const monthIncome = invoices
            .filter((inv) => inv.invoice_date >= monthStartFormatted && inv.invoice_date <= monthEndFormatted)
            .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

          const monthExpense = allExpenses
            .filter((exp) => exp.date >= monthStartFormatted && exp.date <= monthEndFormatted)
            .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

          monthlyData.push({
            month: format(monthDate, 'MMM'),
            income: monthIncome,
            expense: monthExpense,
          });
        }
        setMonthlyTrend(monthlyData);

        // Expense categories
        const categoryData: Record<string, number> = {};
        (expenseCategoriesRes.data || []).forEach((exp: any) => {
          const categoryName = exp.expense_categories?.name || 'Uncategorized';
          categoryData[categoryName] = (categoryData[categoryName] || 0) + Number(exp.amount || 0);
        });
        
        const sortedCategories = Object.entries(categoryData)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value], index) => ({
            name,
            value,
            color: PIE_COLORS[index % PIE_COLORS.length],
          }));
        setExpenseCategories(sortedCategories);

        // Build alerts
        const alertsList: { type: string; message: string; count: number; href: string }[] = [];
        if (overdueInvoices > 0) {
          alertsList.push({
            type: 'destructive',
            message: `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''} need attention`,
            count: overdueInvoices,
            href: '/invoices',
          });
        }
        if (vendorPayable > 0) {
          alertsList.push({
            type: 'warning',
            message: `Vendor payments pending: ${formatCurrency(vendorPayable)}`,
            count: vendorBillsRes.data?.length || 0,
            href: '/vendors',
          });
        }
        if ((leaveRequestsRes.data?.length || 0) > 0) {
          alertsList.push({
            type: 'info',
            message: `${leaveRequestsRes.data?.length} leave request${(leaveRequestsRes.data?.length || 0) > 1 ? 's' : ''} pending approval`,
            count: leaveRequestsRes.data?.length || 0,
            href: '/leave',
          });
        }
        if (tasksDueToday > 0) {
          alertsList.push({
            type: 'warning',
            message: `${tasksDueToday} task${tasksDueToday > 1 ? 's' : ''} due today`,
            count: tasksDueToday,
            href: '/tasks',
          });
        }
        setAlerts(alertsList);

        // Calculate quotation stats by status
        const quotations = quotationsRes.data || [];
        const quotationsDraft = quotations.filter((q: any) => q.status === 'draft').length;
        const quotationsSent = quotations.filter((q: any) => q.status === 'sent').length;
        const quotationsAccepted = quotations.filter((q: any) => q.status === 'accepted').length;
        const quotationsRejected = quotations.filter((q: any) => q.status === 'rejected').length;
        const quotationsConverted = quotations.filter((q: any) => q.status === 'converted').length;
        const quotationsExpired = quotations.filter((q: any) => q.status === 'expired').length;

        // Calculate delivery challan stats by status
        const challans = deliveryChallansRes.data || [];
        const challansDraft = challans.filter((c: any) => c.status === 'draft').length;
        const challansDispatched = challans.filter((c: any) => c.status === 'dispatched').length;
        const challansDelivered = challans.filter((c: any) => c.status === 'delivered').length;
        const challansCancelled = challans.filter((c: any) => c.status === 'cancelled').length;

        setStats({
          todaySales,
          monthlyRevenue,
          monthlyExpense,
          netProfit,
          customerDue,
          vendorPayable,
          pendingInvoices,
          overdueInvoices,
          paidInvoices,
          quotationsDraft,
          quotationsSent,
          quotationsAccepted,
          quotationsRejected,
          quotationsConverted,
          quotationsExpired,
          quotationsTotal: quotations.length,
          challansDraft,
          challansDispatched,
          challansDelivered,
          challansCancelled,
          challansTotal: challans.length,
          totalCustomers: customersRes.count || 0,
          totalEmployees: employeesRes.count || 0,
          todayAttendance: attendanceRes.data?.length || 0,
          pendingLeaves: leaveRequestsRes.data?.length || 0,
          tasksInProgress,
          tasksDueToday,
          lastMonthRevenue,
          lastMonthExpense,
          totalInvoiceAmount,
          totalDueAmount,
          tasksActive,
          tasksInDesign,
          tasksPrinting,
          tasksPackaging,
          tasksDelivered,
        });

        setRecentInvoices(recentInvoicesRes.data || []);
        
        // Set company name from company settings
        if (companySettingsRes.data?.company_name) {
          setCompanyName(companySettingsRes.data.company_name);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAdmin, organization?.id]);

  const chartConfig = {
    income: { label: 'Revenue', color: CHART_COLORS.success },
    expense: { label: 'Expense', color: CHART_COLORS.destructive },
  };

  // Calculate trends
  const revenueTrend = stats.lastMonthRevenue > 0
    ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : 0;
  const expenseTrend = stats.lastMonthExpense > 0
    ? ((stats.monthlyExpense - stats.lastMonthExpense) / stats.lastMonthExpense) * 100
    : 0;

  // Calculate monthly collection (paid_amount from this month's invoices)
  const monthlyCollection = stats.monthlyRevenue;
  // Calculate monthly due (total - paid_amount from all invoices)
  const monthlyDue = stats.customerDue;

  // Mobile: show tile navigation instead of dashboard
  if (isMobile) {
    return <MobileHomeTiles />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        
        {/* 5 KPI cards skeleton - responsive grid */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-8 w-32" />
            </Card>
          ))}
        </div>

        {/* Invoice cards skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        </div>

        {/* Task cards skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-3 grid-cols-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6 w-full min-w-0">
      {/* Header - Company Name in ALL CAPS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight uppercase truncate">
            CREATION PRINTERS
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-9 sm:h-10" onClick={() => navigate('/reports')}>
            <Receipt className="h-4 w-4 mr-1.5 sm:mr-2" />
            <span className="hidden sm:inline">View Reports</span>
            <span className="sm:hidden">Reports</span>
          </Button>
        </div>
      </div>

      {/* 5 Summary Cards - Mobile: 1-col, Tablet: 2-col, Desktop: 5-col */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1. Monthly Invoices */}
        <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Invoices</p>
              <div className="p-1.5 sm:p-2 rounded-full bg-primary/10">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-primary">
              {formatCurrency(stats.monthlyRevenue + stats.customerDue)}
            </p>
          </CardContent>
        </Card>

        {/* 2. Monthly Expenses */}
        <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Expenses</p>
              <div className="p-1.5 sm:p-2 rounded-full bg-destructive/10">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-destructive">
              {formatCurrency(stats.monthlyExpense)}
            </p>
          </CardContent>
        </Card>

        {/* 3. Profit (Invoices - Expenses) */}
        <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Profit</p>
              <div className={cn(
                "p-1.5 sm:p-2 rounded-full",
                stats.netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"
              )}>
                {stats.netProfit >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                )}
              </div>
            </div>
            <p className={cn(
              "text-xl sm:text-2xl font-bold tabular-nums tracking-tight",
              stats.netProfit >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(stats.netProfit)}
            </p>
          </CardContent>
        </Card>

        {/* 4. Monthly Collection */}
        <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Collection</p>
              <div className="p-1.5 sm:p-2 rounded-full bg-success/10">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-success">
              {formatCurrency(monthlyCollection)}
            </p>
          </CardContent>
        </Card>

        {/* 5. Monthly Due */}
        <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Due</p>
              <div className="p-1.5 sm:p-2 rounded-full bg-warning/10">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-warning">
              {formatCurrency(monthlyDue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Dashboard Cards - Mobile: 2-col, Tablet: 3-col, Desktop: 6-col */}
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold">Invoices</h2>
        <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {/* 1. Paid Invoices (count) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Paid</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-success/10">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums tracking-tight text-success">
                {stats.paidInvoices}
              </p>
            </CardContent>
          </Card>

          {/* 2. Unpaid Invoices (count) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Unpaid</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-info/10">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums tracking-tight text-info">
                {stats.pendingInvoices}
              </p>
            </CardContent>
          </Card>

          {/* 3. Overdue Invoices (count) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overdue</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-destructive/10">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums tracking-tight text-destructive">
                {stats.overdueInvoices}
              </p>
            </CardContent>
          </Card>

          {/* 4. Total Invoices (count) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-muted">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {stats.paidInvoices + stats.pendingInvoices + stats.overdueInvoices}
              </p>
            </CardContent>
          </Card>

          {/* 5. Total Invoice Amount (BDT) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Invoice Amt</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 shrink-0">
                  <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold tabular-nums tracking-tight text-primary truncate">
                {formatCurrency(stats.totalInvoiceAmount)}
              </p>
            </CardContent>
          </Card>

          {/* 6. Total Due Amount (BDT) */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Due Amt</p>
                <div className="p-1.5 sm:p-2 rounded-full bg-warning/10 shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold tabular-nums tracking-tight text-warning truncate">
                {formatCurrency(stats.totalDueAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quotations Dashboard Cards */}
      <div className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold">Quotations</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Total Quotations */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs md:text-sm font-medium">Total</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight">
                {stats.quotationsTotal}
              </p>
            </CardContent>
          </Card>

          {/* 2. Draft */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs md:text-sm font-medium">Draft</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-muted-foreground">
                {stats.quotationsDraft}
              </p>
            </CardContent>
          </Card>

          {/* 3. Sent */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-info/10">
                <FileCheck className="h-4 w-4 text-info" />
              </div>
              <p className="text-xs md:text-sm font-medium">Sent</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-info">
                {stats.quotationsSent}
              </p>
            </CardContent>
          </Card>

          {/* 4. Accepted */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <p className="text-xs md:text-sm font-medium">Accepted</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-success">
                {stats.quotationsAccepted}
              </p>
            </CardContent>
          </Card>

          {/* 5. Converted */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs md:text-sm font-medium">Converted</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-primary">
                {stats.quotationsConverted}
              </p>
            </CardContent>
          </Card>

          {/* 6. Rejected/Expired */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/quotations')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-xs md:text-sm font-medium">Rejected</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-destructive">
                {stats.quotationsRejected + stats.quotationsExpired}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delivery Challans Dashboard Cards */}
      <div className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold">Delivery Challans</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* 1. Total Challans */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/delivery-challans')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-muted">
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs md:text-sm font-medium">Total</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight">
                {stats.challansTotal}
              </p>
            </CardContent>
          </Card>

          {/* 2. Draft */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/delivery-challans')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs md:text-sm font-medium">Draft</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-muted-foreground">
                {stats.challansDraft}
              </p>
            </CardContent>
          </Card>

          {/* 3. Dispatched */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/delivery-challans')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-info/10">
                <Package className="h-4 w-4 text-info" />
              </div>
              <p className="text-xs md:text-sm font-medium">Dispatched</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-info">
                {stats.challansDispatched}
              </p>
            </CardContent>
          </Card>

          {/* 4. Delivered */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/delivery-challans')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <p className="text-xs md:text-sm font-medium">Delivered</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-success">
                {stats.challansDelivered}
              </p>
            </CardContent>
          </Card>

          {/* 5. Cancelled */}
          <Card 
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/delivery-challans')}
          >
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-xs md:text-sm font-medium">Cancelled</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-destructive">
                {stats.challansCancelled}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base md:text-lg font-semibold">Production Tasks</h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {/* 1. Active Jobs */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs md:text-sm font-medium">Active Jobs</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-primary">
                {stats.tasksActive}
              </p>
            </CardContent>
          </Card>

          {/* 2. In Design */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-indigo-500/10">
                <Palette className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-xs md:text-sm font-medium">In Design</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-indigo-500">
                {stats.tasksInDesign}
              </p>
            </CardContent>
          </Card>

          {/* 3. Printing */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-orange-500/10">
                <Printer className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-xs md:text-sm font-medium">Printing</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-orange-500">
                {stats.tasksPrinting}
              </p>
            </CardContent>
          </Card>

          {/* 4. Packaging */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Package className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xs md:text-sm font-medium">Packaging</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-purple-500">
                {stats.tasksPackaging}
              </p>
            </CardContent>
          </Card>

          {/* 5. Delivered */}
          <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-2">
              <div className="p-2 rounded-full bg-success/10">
                <Truck className="h-4 w-4 text-success" />
              </div>
              <p className="text-xs md:text-sm font-medium">Delivered</p>
              <p className="text-lg md:text-xl font-bold tabular-nums tracking-tight text-success">
                {stats.tasksDelivered}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {alerts.map((alert, index) => (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                alert.type === 'destructive' && "border-destructive/50 bg-destructive/5",
                alert.type === 'warning' && "border-warning/50 bg-warning/5",
                alert.type === 'info' && "border-info/50 bg-info/5"
              )}
              onClick={() => navigate(alert.href)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  alert.type === 'destructive' && "bg-destructive/10",
                  alert.type === 'warning' && "bg-warning/10",
                  alert.type === 'info' && "bg-info/10"
                )}>
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    alert.type === 'destructive' && "text-destructive",
                    alert.type === 'warning' && "text-warning",
                    alert.type === 'info' && "text-info"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.message}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Spans 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Revenue vs Expenses</CardTitle>
                <CardDescription className="text-sm">6-month trend analysis</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.destructive} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.destructive} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  className="text-xs" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={formatChartCurrency} 
                  className="text-xs" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value: number) => formatCurrency(value)} />}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke={CHART_COLORS.success}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIncome)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke={CHART_COLORS.destructive}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpense)"
                  name="Expense"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Invoice Summary</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: stats.paidInvoices, color: CHART_COLORS.success },
                      { name: 'Pending', value: stats.pendingInvoices - stats.overdueInvoices, color: CHART_COLORS.warning },
                      { name: 'Overdue', value: stats.overdueInvoices, color: CHART_COLORS.destructive },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={CHART_COLORS.success} />
                    <Cell fill={CHART_COLORS.warning} />
                    <Cell fill={CHART_COLORS.destructive} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              <MiniStat label="Paid Invoices" value={stats.paidInvoices} color="success" icon={CheckCircle} />
              <MiniStat label="Pending" value={stats.pendingInvoices - stats.overdueInvoices} color="warning" icon={Clock} />
              <MiniStat label="Overdue" value={stats.overdueInvoices} color="destructive" icon={AlertCircle} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Expense Breakdown</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <CardDescription className="text-sm">This month by category</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length > 0 ? (
              <div className="space-y-3">
                {expenseCategories.map((category, index) => (
                  <div key={category.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{category.name}</span>
                      <span className="font-medium">{formatCurrency(category.value)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(category.value / (expenseCategories[0]?.value || 1)) * 100}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No expenses this month</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HR Snapshot */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">HR Snapshot</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <MiniStat label="Total Employees" value={stats.totalEmployees} icon={Users} />
            <MiniStat 
              label="Today's Attendance" 
              value={`${stats.todayAttendance}/${stats.totalEmployees}`} 
              color={stats.todayAttendance >= stats.totalEmployees * 0.8 ? 'success' : 'warning'}
              icon={UserCheck} 
            />
            <MiniStat 
              label="Pending Leave Requests" 
              value={stats.pendingLeaves} 
              color={stats.pendingLeaves > 0 ? 'warning' : 'default'}
              icon={CalendarDays} 
            />
            <MiniStat 
              label="Tasks In Progress" 
              value={stats.tasksInProgress} 
              icon={ListTodo} 
            />
            <MiniStat 
              label="Tasks Due Today" 
              value={stats.tasksDueToday} 
              color={stats.tasksDueToday > 0 ? 'warning' : 'default'}
              icon={Clock} 
            />
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No invoices found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.slice(0, 4).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{invoice.invoice_number}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {invoice.customers?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-sm">{formatCurrency(invoice.total)}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          invoice.status === 'paid' && "border-success/30 text-success bg-success/10",
                          invoice.status === 'partial' && "border-warning/30 text-warning bg-warning/10",
                          invoice.status === 'unpaid' && "border-destructive/30 text-destructive bg-destructive/10"
                        )}
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
