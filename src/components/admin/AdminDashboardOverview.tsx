import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  UserPlus,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  trialOrgs: number;
  expiredOrgs: number;
  totalUsers: number;
  monthlySignups: number;
}

interface AdminDashboardOverviewProps {
  stats: AdminStats;
}

export const AdminDashboardOverview = ({ stats }: AdminDashboardOverviewProps) => {
  const metrics = [
    {
      title: 'Total Organizations',
      value: stats.totalOrgs,
      icon: Building2,
      trend: '+12%',
      trendUp: true,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeOrgs,
      icon: CreditCard,
      trend: '+8%',
      trendUp: true,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Trial Organizations',
      value: stats.trialOrgs,
      icon: Clock,
      trend: '-3%',
      trendUp: false,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      trend: '+15%',
      trendUp: true,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  const secondaryMetrics = [
    {
      title: 'Expired Accounts',
      value: stats.expiredOrgs,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Monthly Signups',
      value: stats.monthlySignups,
      icon: UserPlus,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className={cn('rounded-lg p-2', metric.bgColor)}>
                <metric.icon className={cn('h-4 w-4', metric.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {metric.value.toLocaleString()}
                </span>
                <span
                  className={cn(
                    'flex items-center text-xs font-medium',
                    metric.trendUp ? 'text-success' : 'text-destructive'
                  )}
                >
                  {metric.trendUp ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {metric.trend}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                vs last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {secondaryMetrics.map((metric) => (
          <Card
            key={metric.title}
            className="transition-all duration-200 hover:shadow-md"
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className={cn('rounded-lg p-3', metric.bgColor)}>
                <metric.icon className={cn('h-5 w-5', metric.color)} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <p className={cn('text-2xl font-bold', metric.color)}>
                  {metric.value.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
