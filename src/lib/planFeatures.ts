import { SubscriptionPlan } from '@/contexts/OrganizationContext';

// Feature keys that can be gated by plan
export type PlanFeature = 
  | 'reports'
  | 'analytics'
  | 'audit_logs'
  | 'api_access'
  | 'custom_branding'
  | 'white_label'
  | 'priority_support'
  | 'advanced_invoicing'
  | 'bulk_operations'
  | 'export_data'
  | 'team_management'
  | 'multi_user'
  | 'notifications'
  | 'delivery_challans';

// Plan limits configuration
export interface PlanLimits {
  maxTeamMembers: number;
  maxCustomers: number;
  maxInvoicesPerMonth: number;
  maxQuotationsPerMonth: number;
  storageGB: number;
}

// Plan configuration
export interface PlanConfig {
  name: string;
  displayName: string;
  features: PlanFeature[];
  limits: PlanLimits;
  trialDays: number;
}

// Plan features matrix
export const planConfigs: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: 'free',
    displayName: 'Free Trial',
    features: [
      'multi_user',
      'team_management',
      'notifications',
      'delivery_challans',
      'export_data',
    ],
    limits: {
      maxTeamMembers: 3,
      maxCustomers: 50,
      maxInvoicesPerMonth: 20,
      maxQuotationsPerMonth: 20,
      storageGB: 1,
    },
    trialDays: 7,
  },
  basic: {
    name: 'basic',
    displayName: 'Basic',
    features: [
      'multi_user',
      'team_management',
      'notifications',
      'delivery_challans',
      'export_data',
      'reports',
    ],
    limits: {
      maxTeamMembers: 5,
      maxCustomers: 200,
      maxInvoicesPerMonth: 100,
      maxQuotationsPerMonth: 100,
      storageGB: 5,
    },
    trialDays: 0,
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    features: [
      'multi_user',
      'team_management',
      'notifications',
      'delivery_challans',
      'export_data',
      'reports',
      'analytics',
      'audit_logs',
      'advanced_invoicing',
      'bulk_operations',
      'priority_support',
    ],
    limits: {
      maxTeamMembers: 15,
      maxCustomers: 1000,
      maxInvoicesPerMonth: 500,
      maxQuotationsPerMonth: 500,
      storageGB: 25,
    },
    trialDays: 0,
  },
  enterprise: {
    name: 'enterprise',
    displayName: 'Enterprise',
    features: [
      'multi_user',
      'team_management',
      'notifications',
      'delivery_challans',
      'export_data',
      'reports',
      'analytics',
      'audit_logs',
      'advanced_invoicing',
      'bulk_operations',
      'priority_support',
      'api_access',
      'custom_branding',
      'white_label',
    ],
    limits: {
      maxTeamMembers: 100,
      maxCustomers: -1, // unlimited
      maxInvoicesPerMonth: -1, // unlimited
      maxQuotationsPerMonth: -1, // unlimited
      storageGB: 100,
    },
    trialDays: 0,
  },
};

// Check if a plan has a specific feature
export const planHasFeature = (plan: SubscriptionPlan | null, feature: PlanFeature): boolean => {
  if (!plan) return false;
  return planConfigs[plan]?.features.includes(feature) ?? false;
};

// Get plan limits
export const getPlanLimits = (plan: SubscriptionPlan | null): PlanLimits => {
  if (!plan) return planConfigs.free.limits;
  return planConfigs[plan]?.limits ?? planConfigs.free.limits;
};

// Get plan display name
export const getPlanDisplayName = (plan: SubscriptionPlan | null): string => {
  if (!plan) return 'No Plan';
  return planConfigs[plan]?.displayName ?? plan;
};

// Get feature display name
export const getFeatureDisplayName = (feature: PlanFeature): string => {
  const names: Record<PlanFeature, string> = {
    reports: 'Reports',
    analytics: 'Analytics Dashboard',
    audit_logs: 'Audit Logs',
    api_access: 'API Access',
    custom_branding: 'Custom Branding',
    white_label: 'White Label',
    priority_support: 'Priority Support',
    advanced_invoicing: 'Advanced Invoicing',
    bulk_operations: 'Bulk Operations',
    export_data: 'Data Export',
    team_management: 'Team Management',
    multi_user: 'Multi-User Access',
    notifications: 'Notifications',
    delivery_challans: 'Delivery Challans',
  };
  return names[feature] ?? feature;
};

// Get minimum plan required for a feature
export const getMinimumPlanForFeature = (feature: PlanFeature): SubscriptionPlan => {
  const plans: SubscriptionPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  for (const plan of plans) {
    if (planConfigs[plan].features.includes(feature)) {
      return plan;
    }
  }
  return 'enterprise';
};

// Check if plan is higher or equal to another
export const isPlanAtLeast = (currentPlan: SubscriptionPlan | null, requiredPlan: SubscriptionPlan): boolean => {
  if (!currentPlan) return false;
  const planOrder: SubscriptionPlan[] = ['free', 'basic', 'pro', 'enterprise'];
  return planOrder.indexOf(currentPlan) >= planOrder.indexOf(requiredPlan);
};
