import { useCallback, useMemo } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePlanLimits } from './usePlanLimits';
import { planHasFeature, getPlanDisplayName, getMinimumPlanForFeature, PlanFeature } from '@/lib/planFeatures';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export type LimitType = 'users' | 'clients' | 'invoices';

export interface LimitWarning {
  type: LimitType;
  level: 'none' | 'soft' | 'hard';
  current: number;
  limit: number | null;
  percentage: number;
  message: string | null;
}

export interface EnforcementResult {
  allowed: boolean;
  reason: 'ok' | 'subscription_expired' | 'limit_reached' | 'feature_blocked';
  message: string | null;
  requiredPlan?: string;
}

// Threshold for soft-limit warnings (80%)
const SOFT_LIMIT_THRESHOLD = 80;

export const useSubscriptionEnforcement = () => {
  const navigate = useNavigate();
  const { subscription, isSubscriptionActive, isTrialExpired, daysRemaining } = useOrganization();
  const { limits, checkLimit, canCreate, loading } = usePlanLimits();

  const currentPlan = subscription?.plan || 'free';

  // Get warning level for a specific limit type
  const getLimitWarning = useCallback((type: LimitType): LimitWarning => {
    const status = checkLimit(type);
    
    // No limit (unlimited)
    if (status.limit === null) {
      return {
        type,
        level: 'none',
        current: status.current,
        limit: null,
        percentage: 0,
        message: null,
      };
    }

    // Hard limit reached
    if (!status.allowed) {
      return {
        type,
        level: 'hard',
        current: status.current,
        limit: status.limit,
        percentage: 100,
        message: `You've reached your ${type} limit (${status.current}/${status.limit}). Upgrade to continue.`,
      };
    }

    // Soft limit warning
    if (status.percentage >= SOFT_LIMIT_THRESHOLD) {
      const remaining = status.limit - status.current;
      return {
        type,
        level: 'soft',
        current: status.current,
        limit: status.limit,
        percentage: status.percentage,
        message: `You're approaching your ${type} limit (${status.current}/${status.limit}). Only ${remaining} remaining.`,
      };
    }

    return {
      type,
      level: 'none',
      current: status.current,
      limit: status.limit,
      percentage: status.percentage,
      message: null,
    };
  }, [checkLimit]);

  // Get all active warnings
  const activeWarnings = useMemo((): LimitWarning[] => {
    if (!limits) return [];
    
    const warnings: LimitWarning[] = [];
    const types: LimitType[] = ['users', 'clients', 'invoices'];
    
    for (const type of types) {
      const warning = getLimitWarning(type);
      if (warning.level !== 'none') {
        warnings.push(warning);
      }
    }
    
    return warnings;
  }, [limits, getLimitWarning]);

  // Check if an action is allowed (with toast feedback)
  const enforceAction = useCallback((
    type: LimitType,
    options?: { silent?: boolean; showUpgrade?: boolean }
  ): EnforcementResult => {
    const { silent = false, showUpgrade = true } = options || {};

    // Check subscription status first
    if (!isSubscriptionActive || isTrialExpired) {
      if (!silent) {
        toast.error('Subscription Required', {
          description: 'Your subscription has expired. Upgrade to continue using this feature.',
          action: showUpgrade ? {
            label: 'Upgrade',
            onClick: () => navigate('/pricing'),
          } : undefined,
        });
      }
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Subscription expired or inactive',
      };
    }

    // Check limit
    const warning = getLimitWarning(type);
    
    if (warning.level === 'hard') {
      if (!silent) {
        toast.error('Limit Reached', {
          description: warning.message || 'You have reached your plan limit.',
          action: showUpgrade ? {
            label: 'Upgrade',
            onClick: () => navigate('/pricing'),
          } : undefined,
        });
      }
      return {
        allowed: false,
        reason: 'limit_reached',
        message: warning.message,
        requiredPlan: currentPlan === 'free' ? 'basic' : currentPlan === 'basic' ? 'pro' : 'enterprise',
      };
    }

    // Show soft warning but allow action
    if (warning.level === 'soft' && !silent) {
      toast.warning('Approaching Limit', {
        description: warning.message,
        action: showUpgrade ? {
          label: 'Upgrade',
          onClick: () => navigate('/pricing'),
        } : undefined,
      });
    }

    return {
      allowed: true,
      reason: 'ok',
      message: null,
    };
  }, [isSubscriptionActive, isTrialExpired, getLimitWarning, currentPlan, navigate]);

  // Check if a feature is available on current plan
  const enforceFeature = useCallback((
    feature: PlanFeature,
    options?: { silent?: boolean; showUpgrade?: boolean }
  ): EnforcementResult => {
    const { silent = false, showUpgrade = true } = options || {};

    // Check subscription status first
    if (!isSubscriptionActive || isTrialExpired) {
      if (!silent) {
        toast.error('Subscription Required', {
          description: 'Your subscription has expired. Upgrade to access this feature.',
          action: showUpgrade ? {
            label: 'Upgrade',
            onClick: () => navigate('/pricing'),
          } : undefined,
        });
      }
      return {
        allowed: false,
        reason: 'subscription_expired',
        message: 'Subscription expired or inactive',
      };
    }

    // Check feature availability
    const hasFeature = planHasFeature(currentPlan, feature);
    
    if (!hasFeature) {
      const requiredPlan = getMinimumPlanForFeature(feature);
      const planName = getPlanDisplayName(requiredPlan);
      
      if (!silent) {
        toast.error('Feature Not Available', {
          description: `This feature requires the ${planName} plan or higher.`,
          action: showUpgrade ? {
            label: `Upgrade to ${planName}`,
            onClick: () => navigate('/pricing'),
          } : undefined,
        });
      }
      return {
        allowed: false,
        reason: 'feature_blocked',
        message: `Requires ${planName} plan`,
        requiredPlan,
      };
    }

    return {
      allowed: true,
      reason: 'ok',
      message: null,
    };
  }, [isSubscriptionActive, isTrialExpired, currentPlan, navigate]);

  // Get trial status info
  const trialInfo = useMemo(() => {
    if (subscription?.status !== 'trial') return null;
    
    return {
      isExpired: isTrialExpired,
      daysRemaining: daysRemaining || 0,
      isExpiringSoon: (daysRemaining || 0) <= 3,
    };
  }, [subscription, isTrialExpired, daysRemaining]);

  return {
    // State
    loading,
    currentPlan,
    isSubscriptionActive,
    isTrialExpired,
    trialInfo,
    limits,
    activeWarnings,
    
    // Methods
    getLimitWarning,
    enforceAction,
    enforceFeature,
    canCreate,
  };
};
