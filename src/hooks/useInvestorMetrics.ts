import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export interface SaaSMetrics {
  mrr: number;
  arr: number;
  arpu: number;
  active_paid: number;
  active_trial: number;
  total_active: number;
  churn_count: number;
  churn_rate: number;
  conversion_count: number;
  conversion_rate: number;
  new_organizations: number;
  mrr_growth: number;
  expansion_revenue: number;
  plan_breakdown: Record<string, { count: number; revenue: number }>;
  period_start: string;
  period_end: string;
  calculated_at: string;
}

export interface MRRTrendPoint {
  snapshot_date: string;
  mrr: number;
  arr: number;
  active_subscriptions: number;
}

export interface RevenueByPlan {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface CustomerHealth {
  at_risk: number;
  high_value: number;
  inactive: number;
}

export type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export const useInvestorMetrics = (initialRange: DateRange = '30d') => {
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [mrrTrend, setMrrTrend] = useState<MRRTrendPoint[]>([]);
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>([]);
  const [customerHealth, setCustomerHealth] = useState<CustomerHealth>({ at_risk: 0, high_value: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);
  const [customDates, setCustomDates] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date()
  });

  const getDateRange = useCallback(() => {
    const end = new Date();
    let start: Date;
    
    switch (dateRange) {
      case 'today':
        start = new Date();
        break;
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      case 'custom':
        return {
          start: format(customDates.start, 'yyyy-MM-dd'),
          end: format(customDates.end, 'yyyy-MM-dd')
        };
      default:
        start = subDays(end, 30);
    }
    
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    };
  }, [dateRange, customDates]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { start, end } = getDateRange();
      
      // Fetch SaaS metrics using database function
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('calculate_saas_metrics', {
          start_date: start,
          end_date: end
        });

      if (metricsError) {
        console.error('Metrics error:', metricsError);
        throw metricsError;
      }

      if (metricsData) {
        setMetrics(metricsData as unknown as SaaSMetrics);
        
        // Process plan breakdown for chart
        const breakdown = (metricsData as unknown as SaaSMetrics).plan_breakdown || {};
        const totalRevenue = Object.values(breakdown).reduce((sum, p) => sum + (p?.revenue || 0), 0);
        
        const planData: RevenueByPlan[] = Object.entries(breakdown).map(([plan, data]) => ({
          plan: plan.charAt(0).toUpperCase() + plan.slice(1),
          count: data?.count || 0,
          revenue: data?.revenue || 0,
          percentage: totalRevenue > 0 ? ((data?.revenue || 0) / totalRevenue) * 100 : 0
        })).filter(p => p.revenue > 0 || p.count > 0);
        
        setRevenueByPlan(planData);
      }

      // Fetch MRR trend
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 30;
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_mrr_trend', { days_back: daysBack });

      if (!trendError && trendData) {
        setMrrTrend(trendData as MRRTrendPoint[]);
      }

      // Fetch customer health data
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString();

      // Get organization stats for health metrics
      const { data: statsData } = await supabase
        .from('organization_usage_stats')
        .select('organization_id, last_activity_at, total_invoices, total_customers')
        .order('stat_date', { ascending: false });

      if (statsData) {
        const latestByOrg = new Map<string, typeof statsData[0]>();
        statsData.forEach(stat => {
          if (!latestByOrg.has(stat.organization_id)) {
            latestByOrg.set(stat.organization_id, stat);
          }
        });

        let atRisk = 0;
        let highValue = 0;
        let inactive = 0;

        latestByOrg.forEach(stat => {
          const lastActivity = stat.last_activity_at ? new Date(stat.last_activity_at) : null;
          
          if (!lastActivity || lastActivity < new Date(fourteenDaysAgo)) {
            atRisk++;
          }
          
          if (!lastActivity || lastActivity < new Date(thirtyDaysAgo)) {
            inactive++;
          }
          
          if ((stat.total_invoices || 0) > 50 || (stat.total_customers || 0) > 100) {
            highValue++;
          }
        });

        setCustomerHealth({ at_risk: atRisk, high_value: highValue, inactive });
      }

    } catch (err) {
      console.error('Error fetching investor metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [getDateRange, dateRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatCurrency = (value: number, currency = 'BDT') => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return {
    metrics,
    mrrTrend,
    revenueByPlan,
    customerHealth,
    loading,
    error,
    dateRange,
    setDateRange,
    customDates,
    setCustomDates,
    refetch: fetchMetrics,
    formatCurrency,
    formatPercentage
  };
};
