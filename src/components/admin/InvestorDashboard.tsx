import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download, Building2,
  UserCheck, UserX, Crown, Calendar
} from 'lucide-react';
import { useInvestorMetrics, DateRange } from '@/hooks/useInvestorMetrics';
import { StatCard } from '@/components/dashboard/StatCard';
import { exportToCSV } from '@/lib/exportUtils';
import { format } from 'date-fns';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export const InvestorDashboard: React.FC = () => {
  const {
    metrics,
    mrrTrend,
    revenueByPlan,
    customerHealth,
    loading,
    dateRange,
    setDateRange,
    refetch,
    formatCurrency,
    formatPercentage
  } = useInvestorMetrics();

  const handleExport = () => {
    if (!metrics) return;

    const exportData = [{
      metric: 'MRR (Monthly Recurring Revenue)',
      value: metrics.mrr,
      formatted: formatCurrency(metrics.mrr)
    }, {
      metric: 'ARR (Annual Recurring Revenue)',
      value: metrics.arr,
      formatted: formatCurrency(metrics.arr)
    }, {
      metric: 'ARPU (Average Revenue Per User)',
      value: metrics.arpu,
      formatted: formatCurrency(metrics.arpu)
    }, {
      metric: 'Active Paid Organizations',
      value: metrics.active_paid,
      formatted: metrics.active_paid.toString()
    }, {
      metric: 'Trial Organizations',
      value: metrics.active_trial,
      formatted: metrics.active_trial.toString()
    }, {
      metric: 'Churn Rate',
      value: metrics.churn_rate,
      formatted: `${metrics.churn_rate}%`
    }, {
      metric: 'Conversion Rate',
      value: metrics.conversion_rate,
      formatted: `${metrics.conversion_rate}%`
    }, {
      metric: 'MRR Growth',
      value: metrics.mrr_growth,
      formatted: formatPercentage(metrics.mrr_growth)
    }, {
      metric: 'New Organizations',
      value: metrics.new_organizations,
      formatted: metrics.new_organizations.toString()
    }, {
      metric: 'Expansion Revenue',
      value: metrics.expansion_revenue,
      formatted: formatCurrency(metrics.expansion_revenue)
    }];

    exportToCSV(exportData, 'investor_metrics', {
      metric: 'Metric',
      value: 'Raw Value',
      formatted: 'Formatted Value'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Investor Metrics</h2>
          <p className="text-muted-foreground">
            Real-time SaaS business metrics and growth analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.mrr || 0)}</div>
            <div className="flex items-center gap-1 mt-1">
              {(metrics?.mrr_growth || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
              <span className={`text-xs font-medium ${(metrics?.mrr_growth || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercentage(metrics?.mrr_growth || 0)}
              </span>
              <span className="text-xs text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.arr || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Annual Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics?.arpu || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per {metrics?.active_paid || 0} paid orgs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_active || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="text-xs">{metrics?.active_paid || 0} Paid</Badge>
              <Badge variant="secondary" className="text-xs">{metrics?.active_trial || 0} Trial</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Churn Rate"
          value={`${metrics?.churn_rate || 0}%`}
          icon={UserX}
          subtitle={`${metrics?.churn_count || 0} churned this period`}
          iconClassName={(metrics?.churn_rate || 0) > 5 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}
        />
        <StatCard
          title="Conversion Rate"
          value={`${metrics?.conversion_rate || 0}%`}
          icon={UserCheck}
          subtitle={`${metrics?.conversion_count || 0} converted`}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="New Signups"
          value={metrics?.new_organizations || 0}
          icon={Users}
          subtitle="This period"
          iconClassName="bg-info/10 text-info"
        />
        <StatCard
          title="Expansion Revenue"
          value={formatCurrency(metrics?.expansion_revenue || 0)}
          icon={Crown}
          subtitle="From upgrades"
          iconClassName="bg-warning/10 text-warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* MRR Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>MRR Trend</CardTitle>
            <CardDescription>Monthly recurring revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {mrrTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrTrend}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="snapshot_date" 
                      tickFormatter={(v) => format(new Date(v), 'MMM d')}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">{format(new Date(payload[0].payload.snapshot_date), 'MMM d, yyyy')}</p>
                              <p className="text-sm text-muted-foreground">
                                MRR: <span className="font-medium text-foreground">{formatCurrency(payload[0].value as number)}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#mrrGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No historical data available yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {revenueByPlan.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByPlan}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="revenue"
                      label={({ plan, percentage }) => `${plan} (${percentage.toFixed(0)}%)`}
                    >
                      {revenueByPlan.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-medium">{data.plan}</p>
                              <p className="text-sm text-muted-foreground">
                                Revenue: <span className="font-medium text-foreground">{formatCurrency(data.revenue)}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Organizations: <span className="font-medium text-foreground">{data.count}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Health */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Health Overview</CardTitle>
          <CardDescription>Tenant engagement and risk indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customerHealth.at_risk}</p>
                <p className="text-sm text-muted-foreground">At-Risk Tenants</p>
                <p className="text-xs text-muted-foreground">Inactive 14+ days</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="p-3 rounded-full bg-success/10">
                <Crown className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customerHealth.high_value}</p>
                <p className="text-sm text-muted-foreground">High-Value Tenants</p>
                <p className="text-xs text-muted-foreground">50+ invoices or 100+ customers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted border">
              <div className="p-3 rounded-full bg-muted-foreground/10">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customerHealth.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive Organizations</p>
                <p className="text-xs text-muted-foreground">No activity in 30 days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics Summary</CardTitle>
          <CardDescription>
            Calculated for period: {metrics?.period_start} to {metrics?.period_end}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total MRR', value: formatCurrency(metrics?.mrr || 0), trend: metrics?.mrr_growth || 0 },
              { label: 'Total ARR', value: formatCurrency(metrics?.arr || 0) },
              { label: 'Avg Revenue/User', value: formatCurrency(metrics?.arpu || 0) },
              { label: 'Paid Customers', value: metrics?.active_paid || 0 },
              { label: 'Trial Customers', value: metrics?.active_trial || 0 },
              { label: 'Churn Rate', value: `${metrics?.churn_rate || 0}%`, isNegative: true },
              { label: 'Conversion Rate', value: `${metrics?.conversion_rate || 0}%` },
              { label: 'Net New', value: metrics?.new_organizations || 0 }
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-lg font-semibold">{item.value}</span>
                {item.trend !== undefined && (
                  <span className={`text-xs ${item.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatPercentage(item.trend)} MoM
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
