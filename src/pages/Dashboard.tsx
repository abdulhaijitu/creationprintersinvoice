import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'recharts';
import {
  FileText,
  Wallet,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { bn } from 'date-fns/locale';

interface DashboardStats {
  todaySales: number;
  monthlyIncome: number;
  monthlyExpense: number;
  pendingInvoices: number;
  pendingQuotations: number;
  totalCustomers: number;
  vendorDue: number;
  pendingLeaveRequests: number;
  pendingTasks: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface InvoiceStatusData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    pendingInvoices: 0,
    pendingQuotations: 0,
    totalCustomers: 0,
    vendorDue: 0,
    pendingLeaveRequests: 0,
    pendingTasks: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyData[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        const monthStart = startOfMonth(today);
        const todayStr = format(today, 'yyyy-MM-dd');
        const monthStartStr = format(monthStart, 'yyyy-MM-dd');

        // Get last 6 months for trend data
        const sixMonthsAgo = subMonths(today, 5);
        const sixMonthsAgoStr = format(startOfMonth(sixMonthsAgo), 'yyyy-MM-dd');

        // Fetch stats in parallel
        const [
          invoicesRes,
          quotationsRes,
          customersRes,
          expensesRes,
          recentInvoicesRes,
          vendorBillsRes,
          leaveRequestsRes,
          tasksRes,
          allExpensesRes,
        ] = await Promise.all([
          supabase.from('invoices').select('total, paid_amount, status, invoice_date'),
          supabase.from('quotations').select('status').eq('status', 'pending'),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase
            .from('expenses')
            .select('amount')
            .gte('date', monthStartStr),
          supabase
            .from('invoices')
            .select('*, customers(name)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('vendor_bills').select('amount, status').neq('status', 'paid'),
          isAdmin
            ? supabase.from('leave_requests').select('id').eq('status', 'pending')
            : Promise.resolve({ data: [], count: 0 }),
          supabase
            .from('tasks')
            .select('id')
            .eq('assigned_to', user?.id)
            .neq('status', 'completed'),
          supabase
            .from('expenses')
            .select('amount, date')
            .gte('date', sixMonthsAgoStr),
        ]);

        // Calculate stats
        const invoices = invoicesRes.data || [];
        const todayInvoices = invoices.filter((inv) => inv.invoice_date === todayStr);
        const monthlyInvoices = invoices.filter(
          (inv) => inv.invoice_date >= monthStartStr
        );

        const todaySales = todayInvoices.reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const monthlyIncome = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const monthlyExpense = (expensesRes.data || []).reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0
        );
        const pendingInvoices = invoices.filter(
          (inv) => inv.status === 'unpaid' || inv.status === 'partial'
        ).length;
        const vendorDue = (vendorBillsRes.data || []).reduce(
          (sum, bill) => sum + Number(bill.amount || 0),
          0
        );

        // Calculate invoice status distribution
        const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
        const partialCount = invoices.filter((inv) => inv.status === 'partial').length;
        const unpaidCount = invoices.filter((inv) => inv.status === 'unpaid').length;
        setInvoiceStatusData([
          { name: 'পরিশোধিত', value: paidCount, color: COLORS[0] },
          { name: 'আংশিক', value: partialCount, color: COLORS[1] },
          { name: 'বাকি', value: unpaidCount, color: COLORS[2] },
        ]);

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
            .filter(
              (inv) =>
                inv.invoice_date >= monthStartFormatted &&
                inv.invoice_date <= monthEndFormatted
            )
            .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

          const monthExpense = allExpenses
            .filter(
              (exp) =>
                exp.date >= monthStartFormatted && exp.date <= monthEndFormatted
            )
            .reduce((sum, exp) => sum + Number(exp.amount || 0), 0);

          monthlyData.push({
            month: format(monthDate, 'MMM', { locale: bn }),
            income: monthIncome,
            expense: monthExpense,
          });
        }
        setMonthlyTrend(monthlyData);

        setStats({
          todaySales,
          monthlyIncome,
          monthlyExpense,
          pendingInvoices,
          pendingQuotations: quotationsRes.data?.length || 0,
          totalCustomers: customersRes.count || 0,
          vendorDue,
          pendingLeaveRequests: (leaveRequestsRes as any).data?.length || 0,
          pendingTasks: tasksRes.data?.length || 0,
        });

        setRecentInvoices(recentInvoicesRes.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAdmin]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatChartCurrency = (value: number) => {
    if (value >= 1000000) {
      return `৳${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `৳${(value / 1000).toFixed(0)}K`;
    }
    return `৳${value}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/10 text-success border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            পরিশোধিত
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0">
            <Clock className="w-3 h-3 mr-1" />
            আংশিক
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0">
            <XCircle className="w-3 h-3 mr-1" />
            বাকি
          </Badge>
        );
      default:
        return null;
    }
  };

  const chartConfig = {
    income: {
      label: 'আয়',
      color: 'hsl(var(--success))',
    },
    expense: {
      label: 'ব্যয়',
      color: 'hsl(var(--destructive))',
    },
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-80 bg-muted rounded-xl" />
          <div className="h-80 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: bn })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="আজকের বিক্রয়"
          value={formatCurrency(stats.todaySales)}
          icon={TrendingUp}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="মাসিক আয়"
          value={formatCurrency(stats.monthlyIncome)}
          icon={Wallet}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="মাসিক খরচ"
          value={formatCurrency(stats.monthlyExpense)}
          icon={Wallet}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="মোট গ্রাহক"
          value={stats.totalCustomers}
          icon={Users}
          iconClassName="bg-info/10 text-info"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Income vs Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle>মাসিক আয়-ব্যয় ট্রেন্ড</CardTitle>
            <CardDescription>শেষ ৬ মাসের তুলনামূলক চিত্র</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={formatChartCurrency} className="text-xs" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  }
                />
                <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="আয়" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="ব্যয়" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Income Expense Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>আয়-ব্যয় লাইন চার্ট</CardTitle>
            <CardDescription>মাসভিত্তিক প্রবণতা বিশ্লেষণ</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis tickFormatter={formatChartCurrency} className="text-xs" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))', strokeWidth: 2 }}
                  name="আয়"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  name="ব্যয়"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Invoice Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>ইনভয়েস স্ট্যাটাস</CardTitle>
            <CardDescription>পেমেন্ট অবস্থা বিশ্লেষণ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {invoiceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value: string) => <span className="text-foreground text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className={stats.pendingInvoices > 0 ? 'border-warning' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-warning" />
              পেন্ডিং ইনভয়েস
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-warning">{stats.pendingInvoices}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.pendingInvoices > 0 ? 'পেমেন্ট বাকি আছে' : 'সব ইনভয়েস পরিশোধিত'}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.vendorDue > 0 ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ভেন্ডর ডিউ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(stats.vendorDue)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.vendorDue > 0 ? 'ভেন্ডরদের পেমেন্ট বাকি' : 'সব পেমেন্ট সম্পন্ন'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>সাম্প্রতিক ইনভয়েস</CardTitle>
          <CardDescription>শেষ ৫টি ইনভয়েস</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                কোনো ইনভয়েস নেই
              </p>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customers?.name || 'অজানা গ্রাহক'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(invoice.total))}</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
