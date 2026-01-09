import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgScopedQuery } from '@/hooks/useOrgScopedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertCircle, Users, FileText, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface AnalyticsData {
  totalRevenue: number;
  paidAmount: number;
  dueAmount: number;
  overdueInvoices: number;
  overdueAmount: number;
  monthlyTrend: { month: string; revenue: number; paid: number }[];
  topCustomers: { name: string; revenue: number }[];
  invoiceStatusBreakdown: { status: string; count: number; amount: number }[];
  previousMonthRevenue: number;
}

const CHART_COLORS = [
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--info))',
];

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0 })}`;
};

export function BusinessAnalyticsDashboard() {
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!hasOrgContext || !organizationId) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date();
        const sixMonthsAgo = subMonths(today, 5);
        const currentMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
        const lastMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
        const lastMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');

        // Fetch all invoices for the org
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, total, paid_amount, status, invoice_date, due_date, customer_id, customers(name)')
          .eq('organization_id', organizationId);

        if (!invoices) {
          setLoading(false);
          return;
        }

        // Calculate totals
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const paidAmount = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
        const dueAmount = totalRevenue - paidAmount;

        // Overdue invoices
        const overdueInvoices = invoices.filter(inv => {
          if (inv.status === 'paid') return false;
          if (!inv.due_date) return false;
          return new Date(inv.due_date) < today;
        });
        const overdueAmount = overdueInvoices.reduce(
          (sum, inv) => sum + (Number(inv.total) - Number(inv.paid_amount)), 0
        );

        // Previous month revenue
        const previousMonthRevenue = invoices
          .filter(inv => inv.invoice_date >= lastMonthStart && inv.invoice_date <= lastMonthEnd)
          .reduce((sum, inv) => sum + Number(inv.paid_amount), 0);

        // Monthly trend
        const monthlyTrend: { month: string; revenue: number; paid: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(today, i);
          const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
          const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

          const monthInvoices = invoices.filter(
            inv => inv.invoice_date >= monthStart && inv.invoice_date <= monthEnd
          );

          monthlyTrend.push({
            month: format(monthDate, 'MMM'),
            revenue: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
            paid: monthInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0),
          });
        }

        // Top customers by revenue
        const customerRevenue: Record<string, { name: string; revenue: number }> = {};
        invoices.forEach(inv => {
          const customerName = (inv.customers as any)?.name || 'Unknown';
          if (!customerRevenue[customerName]) {
            customerRevenue[customerName] = { name: customerName, revenue: 0 };
          }
          customerRevenue[customerName].revenue += Number(inv.total);
        });
        const topCustomers = Object.values(customerRevenue)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Invoice status breakdown
        const statusCounts: Record<string, { count: number; amount: number }> = {
          paid: { count: 0, amount: 0 },
          partial: { count: 0, amount: 0 },
          unpaid: { count: 0, amount: 0 },
          overdue: { count: 0, amount: 0 },
        };

        invoices.forEach(inv => {
          const isOverdue = inv.status !== 'paid' && inv.due_date && new Date(inv.due_date) < today;
          const status = isOverdue ? 'overdue' : (inv.status as string);
          if (statusCounts[status]) {
            statusCounts[status].count++;
            statusCounts[status].amount += Number(inv.total);
          }
        });

        const invoiceStatusBreakdown = Object.entries(statusCounts)
          .filter(([_, val]) => val.count > 0)
          .map(([status, val]) => ({
            status: status.charAt(0).toUpperCase() + status.slice(1),
            ...val,
          }));

        setData({
          totalRevenue,
          paidAmount,
          dueAmount,
          overdueInvoices: overdueInvoices.length,
          overdueAmount,
          monthlyTrend,
          topCustomers,
          invoiceStatusBreakdown,
          previousMonthRevenue,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [organizationId, hasOrgContext]);

  const revenueGrowth = useMemo(() => {
    if (!data || data.previousMonthRevenue === 0) return 0;
    const currentMonth = data.monthlyTrend[data.monthlyTrend.length - 1]?.paid || 0;
    return ((currentMonth - data.previousMonthRevenue) / data.previousMonthRevenue) * 100;
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <div className="flex items-center gap-1 mt-1">
              {revenueGrowth >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-xs ${revenueGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(data.paidAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalRevenue > 0 ? ((data.paidAmount / data.totalRevenue) * 100).toFixed(0) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(data.dueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalRevenue > 0 ? ((data.dueAmount / data.totalRevenue) * 100).toFixed(0) : 0}% pending
            </p>
          </CardContent>
        </Card>

        <Card className={data.overdueAmount > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className={`h-4 w-4 ${data.overdueAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(data.overdueAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overdueInvoices} invoice{data.overdueInvoices !== 1 ? 's' : ''} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue vs collections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyTrend}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="text-sm font-medium">{payload[0].payload.month}</p>
                            <p className="text-sm text-muted-foreground">
                              Revenue: <span className="font-medium text-foreground">{formatCurrency(payload[0].payload.revenue)}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Collected: <span className="font-medium text-success">{formatCurrency(payload[0].payload.paid)}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="paid"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>By total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {data.topCustomers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topCustomers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Revenue: <span className="font-medium text-foreground">{formatCurrency(payload[0].payload.revenue)}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No customer data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
          <CardDescription>Breakdown by payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {data.invoiceStatusBreakdown.map((item, index) => (
              <div
                key={item.status}
                className="flex items-center gap-4 p-4 rounded-lg border"
                style={{ borderColor: `${CHART_COLORS[index % CHART_COLORS.length]}40` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <div>
                  <p className="font-medium">{item.status}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.count} invoices • {formatCurrency(item.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
