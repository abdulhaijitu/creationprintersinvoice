import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface UsagePercentage {
  feature: string;
  current_usage: number;
  plan_limit: number;
  usage_percentage: number;
}

export interface OrganizationUsageStats {
  id: string;
  organization_id: string;
  stat_date: string;
  total_users: number;
  total_customers: number;
  total_invoices: number;
  total_payments: number;
  total_expenses: number;
  total_quotations: number;
  total_employees: number;
  login_count: number;
  last_activity_at: string | null;
}

export interface PlanLimit {
  id: string;
  plan_name: string;
  user_limit: number;
  customer_limit: number;
  invoice_limit: number;
  expense_limit: number;
  quotation_limit: number;
  employee_limit: number;
}

export interface UsageAlert {
  feature: string;
  level: 'warning' | 'critical' | 'blocked';
  message: string;
  percentage: number;
}

export const useUsageAnalytics = () => {
  const { organization, subscription } = useOrganization();
  const [usagePercentages, setUsagePercentages] = useState<UsagePercentage[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimit | null>(null);
  const [usageStats, setUsageStats] = useState<OrganizationUsageStats | null>(null);
  const [alerts, setAlerts] = useState<UsageAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsageData = async () => {
    if (!organization) {
      setLoading(false);
      return;
    }

    try {
      // Get usage percentages using the database function
      const { data: percentages, error: percentageError } = await supabase
        .rpc('get_org_usage_percentage', { org_id: organization.id });

      if (percentageError) {
        console.error('Error fetching usage percentages:', percentageError);
      } else {
        setUsagePercentages(percentages || []);
        
        // Generate alerts based on usage
        const newAlerts: UsageAlert[] = [];
        (percentages || []).forEach((p: UsagePercentage) => {
          if (p.usage_percentage >= 100) {
            newAlerts.push({
              feature: p.feature,
              level: 'blocked',
              message: `${p.feature} limit reached. Upgrade required.`,
              percentage: p.usage_percentage
            });
          } else if (p.usage_percentage >= 90) {
            newAlerts.push({
              feature: p.feature,
              level: 'critical',
              message: `${p.feature} at ${p.usage_percentage}%. Upgrade recommended.`,
              percentage: p.usage_percentage
            });
          } else if (p.usage_percentage >= 70) {
            newAlerts.push({
              feature: p.feature,
              level: 'warning',
              message: `${p.feature} at ${p.usage_percentage}%.`,
              percentage: p.usage_percentage
            });
          }
        });
        setAlerts(newAlerts);
      }

      // Get plan limits
      const planName = subscription?.plan || 'free';
      const { data: limits, error: limitsError } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_name', planName)
        .single();

      if (limitsError) {
        console.error('Error fetching plan limits:', limitsError);
      } else {
        setPlanLimits(limits);
      }

      // Get latest usage stats
      const { data: stats, error: statsError } = await supabase
        .from('organization_usage_stats')
        .select('*')
        .eq('organization_id', organization.id)
        .order('stat_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (statsError) {
        console.error('Error fetching usage stats:', statsError);
      } else {
        setUsageStats(stats);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUsageData:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
  }, [organization?.id, subscription?.plan]);

  const hasBlockedFeature = alerts.some(a => a.level === 'blocked');
  const hasCriticalAlert = alerts.some(a => a.level === 'critical');
  const hasWarningAlert = alerts.some(a => a.level === 'warning');

  return {
    usagePercentages,
    planLimits,
    usageStats,
    alerts,
    loading,
    hasBlockedFeature,
    hasCriticalAlert,
    hasWarningAlert,
    refetchUsage: fetchUsageData
  };
};

// Hook for super admin analytics
export const useAdminAnalytics = () => {
  const [allOrgsStats, setAllOrgsStats] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<Record<string, number>>({});
  const [churnRiskOrgs, setChurnRiskOrgs] = useState<any[]>([]);
  const [highUsageOrgs, setHighUsageOrgs] = useState<any[]>([]);
  const [lowUsageOrgs, setLowUsageOrgs] = useState<any[]>([]);
  const [monthlyActiveOrgs, setMonthlyActiveOrgs] = useState<number>(0);
  const [growthTrend, setGrowthTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminAnalytics = async () => {
    try {
      // Get all organizations with their subscriptions
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          created_at,
          subscriptions (
            plan,
            status,
            trial_ends_at
          )
        `);

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        setLoading(false);
        return;
      }

      // Get all usage stats
      const { data: allStats, error: statsError } = await supabase
        .from('organization_usage_stats')
        .select('*')
        .order('stat_date', { ascending: false });

      if (statsError) {
        console.error('Error fetching all stats:', statsError);
      }

      // Calculate plan distribution
      const distribution: Record<string, number> = { free: 0, basic: 0, pro: 0, enterprise: 0 };
      orgs?.forEach(org => {
        const plan = (org.subscriptions as any)?.[0]?.plan || 'free';
        distribution[plan] = (distribution[plan] || 0) + 1;
      });
      setPlanDistribution(distribution);

      // Get latest stats per org
      const latestStatsByOrg = new Map<string, any>();
      allStats?.forEach(stat => {
        if (!latestStatsByOrg.has(stat.organization_id)) {
          latestStatsByOrg.set(stat.organization_id, stat);
        }
      });

      // Identify churn risk (no activity in 14+ days)
      const churnRisk: any[] = [];
      const highUsage: any[] = [];
      const lowUsage: any[] = [];
      const now = new Date();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      orgs?.forEach(org => {
        const stats = latestStatsByOrg.get(org.id);
        const orgWithStats = { ...org, stats };
        
        if (stats) {
          const lastActivity = stats.last_activity_at ? new Date(stats.last_activity_at) : null;
          
          if (!lastActivity || lastActivity < fourteenDaysAgo) {
            churnRisk.push(orgWithStats);
          }
          
          // High usage: more than 50 invoices or 100 customers
          if (stats.total_invoices > 50 || stats.total_customers > 100) {
            highUsage.push(orgWithStats);
          }
          
          // Low usage: less than 5 invoices and less than 10 customers
          if (stats.total_invoices < 5 && stats.total_customers < 10) {
            lowUsage.push(orgWithStats);
          }
        } else {
          churnRisk.push(orgWithStats);
          lowUsage.push(orgWithStats);
        }
      });

      setChurnRiskOrgs(churnRisk);
      setHighUsageOrgs(highUsage);
      setLowUsageOrgs(lowUsage);

      // Monthly active orgs (activity in last 30 days)
      let activeCount = 0;
      latestStatsByOrg.forEach(stats => {
        const lastActivity = stats.last_activity_at ? new Date(stats.last_activity_at) : null;
        if (lastActivity && lastActivity > thirtyDaysAgo) {
          activeCount++;
        }
      });
      setMonthlyActiveOrgs(activeCount);

      // Growth trend (organizations created per month)
      const monthlyGrowth: Record<string, number> = {};
      orgs?.forEach(org => {
        const month = org.created_at.substring(0, 7); // YYYY-MM
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      });
      
      const growthData = Object.entries(monthlyGrowth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));
      setGrowthTrend(growthData);

      setAllOrgsStats(Array.from(latestStatsByOrg.values()));
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchAdminAnalytics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminAnalytics();
  }, []);

  return {
    allOrgsStats,
    planDistribution,
    churnRiskOrgs,
    highUsageOrgs,
    lowUsageOrgs,
    monthlyActiveOrgs,
    growthTrend,
    loading,
    refetch: fetchAdminAnalytics
  };
};
