import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CreditCard, TrendingUp, AlertTriangle, Clock, Calendar, UserPlus } from 'lucide-react';

interface AdminStats {
  totalOrgs: number;
  activeOrgs: number;
  trialOrgs: number;
  expiredOrgs: number;
  totalUsers: number;
  monthlySignups: number;
}

interface AdminDashboardWidgetsProps {
  stats: AdminStats;
}

const AdminDashboardWidgets = ({ stats }: AdminDashboardWidgetsProps) => {
  const widgets = [
    {
      title: 'Total Organizations',
      value: stats.totalOrgs,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeOrgs,
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Trial Organizations',
      value: stats.trialOrgs,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Expired Accounts',
      value: stats.expiredOrgs,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Monthly Signups',
      value: stats.monthlySignups,
      icon: UserPlus,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {widgets.map((widget) => (
        <Card key={widget.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {widget.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${widget.bgColor}`}>
              <widget.icon className={`h-4 w-4 ${widget.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${widget.color}`}>{widget.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminDashboardWidgets;
