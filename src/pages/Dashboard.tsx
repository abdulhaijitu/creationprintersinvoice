import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CardSkeleton } from '@/components/shared/TableSkeleton';
import { formatCurrency, formatChartCurrency } from '@/lib/formatters';

interface DashboardStats {
  todaySales: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  netProfit: number;
  customerDue: number;
  vendorPayable: number;
  pendingInvoices: number;
  pendingQuotations: number;
  totalCustomers: number;
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
    monthlyRevenue: 0,
    monthlyExpense: 0,
    netProfit: 0,
    customerDue: 0,
    vendorPayable: 0,
    pendingInvoices: 0,
    pendingQuotations: 0,
    totalCustomers: 0,
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
        const monthlyRevenue = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const monthlyExpense = (expensesRes.data || []).reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0
        );
        const netProfit = monthlyRevenue - monthlyExpense;
        const pendingInvoices = invoices.filter(
          (inv) => inv.status === 'unpaid' || inv.status === 'partial'
        ).length;
        
        // Calculate customer due (total - paid from all invoices)
        const customerDue = invoices.reduce(
          (sum, inv) => sum + (Number(inv.total || 0) - Number(inv.paid_amount || 0)),
          0
        );
        
        const vendorPayable = (vendorBillsRes.data || []).reduce(
          (sum, bill) => sum + Number(bill.amount || 0),
          0
        );

        // Calculate invoice status distribution
        const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
        const partialCount = invoices.filter((inv) => inv.status === 'partial').length;
        const unpaidCount = invoices.filter((inv) => inv.status === 'unpaid').length;
        setInvoiceStatusData([
          { name: 'Paid', value: paidCount, color: COLORS[0] },
          { name: 'Partial', value: partialCount, color: COLORS[1] },
          { name: 'Unpaid', value: unpaidCount, color: COLORS[2] },
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
            month: format(monthDate, 'MMM'),
            income: monthIncome,
            expense: monthExpense,
          });
        }
        setMonthlyTrend(monthlyData);

        setStats({
          todaySales,
          monthlyRevenue,
          monthlyExpense,
          netProfit,
          customerDue,
          vendorPayable,
          pendingInvoices,
          pendingQuotations: quotationsRes.data?.length || 0,
          totalCustomers: customersRes.count || 0,
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

  const chartConfig = {
    income: {
      label: 'Income',
      color: 'hsl(var(--success))',
    },
    expense: {
      label: 'Expense',
      color: 'hsl(var(--destructive))',
    },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton count={6} className="lg:grid-cols-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton count={1} className="h-80" />
          <CardSkeleton count={1} className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySales)}
          icon={TrendingUp}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={Wallet}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Monthly Expense"
          value={formatCurrency(stats.monthlyExpense)}
          icon={Wallet}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={TrendingUp}
          iconClassName={stats.netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
        />
        <StatCard
          title="Customer Due"
          value={formatCurrency(stats.customerDue)}
          icon={Users}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="Vendor Payable"
          value={formatCurrency(stats.vendorPayable)}
          icon={AlertCircle}
          iconClassName="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Income vs Expense Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Income-Expense Trend</CardTitle>
            <CardDescription>Last 6 months comparison</CardDescription>
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
                <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Income Expense Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income-Expense Line Chart</CardTitle>
            <CardDescription>Monthly trend analysis</CardDescription>
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
                  name="Income"
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  name="Expense"
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
            <CardTitle>Invoice Status</CardTitle>
            <CardDescription>Payment status analysis</CardDescription>
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
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-warning">{stats.pendingInvoices}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.pendingInvoices > 0 ? 'Payments pending' : 'All invoices paid'}
            </p>
          </CardContent>
        </Card>

        <Card className={stats.vendorPayable > 0 ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Vendor Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(stats.vendorPayable)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.vendorPayable > 0 ? 'Vendor payments pending' : 'All payments complete'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Last 5 invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No invoices found
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
                        {invoice.customers?.name || 'Unknown customer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(invoice.total))}</p>
                    <StatusBadge status={invoice.status} />
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
