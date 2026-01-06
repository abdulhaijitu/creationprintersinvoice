import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';
import { useOrganization } from '@/contexts/OrganizationContext';
import { UsageProgressBar } from './UsageProgressBar';
import { AlertTriangle, ArrowUpCircle, TrendingUp, Users, FileText, Receipt, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export const UsageDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useOrganization();
  const { 
    usagePercentages, 
    planLimits, 
    usageStats, 
    alerts,
    loading, 
    hasBlockedFeature, 
    hasCriticalAlert 
  } = useUsageAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const planName = subscription?.plan || 'free';
  const formattedPlanName = planName.charAt(0).toUpperCase() + planName.slice(1);

  const featureIcons: Record<string, React.ReactNode> = {
    users: <Users className="h-4 w-4" />,
    customers: <UserCheck className="h-4 w-4" />,
    invoices: <FileText className="h-4 w-4" />,
    expenses: <Receipt className="h-4 w-4" />,
    quotations: <FileText className="h-4 w-4" />,
    employees: <Users className="h-4 w-4" />
  };

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {(hasBlockedFeature || hasCriticalAlert) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {hasBlockedFeature ? 'Limit Reached' : 'Usage Warning'}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>
              {hasBlockedFeature 
                ? 'You have reached one or more of your plan limits. Upgrade now to continue using all features.'
                : 'You are approaching your plan limits. Consider upgrading to avoid service interruption.'
              }
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-fit"
              onClick={() => navigate('/pricing')}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              View Upgrade Options
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Plan: {formattedPlanName}
              </CardTitle>
              <CardDescription>
                Your usage overview and plan limits
              </CardDescription>
            </div>
            <Badge variant={planName === 'free' ? 'secondary' : 'default'}>
              {formattedPlanName} Plan
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {usagePercentages.map((usage) => (
              <Card key={usage.feature} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {featureIcons[usage.feature]}
                  <span className="font-medium capitalize">{usage.feature}</span>
                </div>
                <UsageProgressBar
                  feature={usage.feature}
                  current={usage.current_usage}
                  limit={usage.plan_limit}
                  percentage={usage.usage_percentage}
                />
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {usageStats && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>
              Last updated: {usageStats.last_activity_at 
                ? new Date(usageStats.last_activity_at).toLocaleString()
                : 'N/A'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{usageStats.total_invoices}</p>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{usageStats.total_customers}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{usageStats.total_payments}</p>
                <p className="text-sm text-muted-foreground">Payments Recorded</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{usageStats.total_expenses}</p>
                <p className="text-sm text-muted-foreground">Expenses Tracked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade CTA */}
      {planName !== 'enterprise' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Need more capacity?</h3>
                <p className="text-muted-foreground">
                  Upgrade your plan to unlock more features and higher limits.
                </p>
              </div>
              <Button onClick={() => navigate('/pricing')}>
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
