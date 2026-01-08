import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

export type OnboardingStepStatus = 'pending' | 'started' | 'completed' | 'skipped';

export interface OnboardingStep {
  key: string;
  name: string;
  description: string;
  roles: string[];
  autoCompleteAction?: string;
  icon?: string;
}

export interface OnboardingStepProgress {
  step_key: string;
  step_name: string;
  status: OnboardingStepStatus;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
}

export interface OnboardingProgress {
  total_steps: number;
  completed_steps: number;
  skipped_steps: number;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
}

// Role-based onboarding steps
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'configure_branding',
    name: 'Configure Branding',
    description: 'Customize your organization\'s logo and colors',
    roles: ['owner', 'admin'],
    autoCompleteAction: 'branding_updated',
  },
  {
    key: 'invite_team',
    name: 'Invite Team Members',
    description: 'Add your team to collaborate',
    roles: ['owner', 'admin'],
    autoCompleteAction: 'member_invited',
  },
  {
    key: 'create_first_invoice',
    name: 'Create First Invoice',
    description: 'Generate your first invoice',
    roles: ['owner', 'admin', 'manager', 'accounts'],
    autoCompleteAction: 'invoice_created',
  },
  {
    key: 'add_customer',
    name: 'Add a Customer',
    description: 'Add your first customer to the system',
    roles: ['owner', 'admin', 'manager', 'accounts', 'sales_staff'],
    autoCompleteAction: 'customer_created',
  },
  {
    key: 'create_quotation',
    name: 'Create a Quotation',
    description: 'Create your first quotation',
    roles: ['owner', 'admin', 'manager', 'sales_staff'],
    autoCompleteAction: 'quotation_created',
  },
  {
    key: 'add_employee',
    name: 'Add an Employee',
    description: 'Add employees for HR management',
    roles: ['owner', 'admin', 'manager'],
    autoCompleteAction: 'employee_created',
  },
  {
    key: 'configure_settings',
    name: 'Configure Settings',
    description: 'Set up your organization preferences',
    roles: ['owner', 'admin'],
    autoCompleteAction: 'settings_updated',
  },
];

export const useOnboardingAnalytics = () => {
  const { user, role } = useAuth();
  const { organization, membership } = useOrganization();
  const [steps, setSteps] = useState<OnboardingStepProgress[]>([]);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableSteps, setAvailableSteps] = useState<OnboardingStep[]>([]);

  // Get steps available for current role
  const getStepsForRole = useCallback(() => {
    const userRole = membership?.role || 'member';
    return ONBOARDING_STEPS.filter(step => step.roles.includes(userRole));
  }, [membership?.role]);

  // Initialize onboarding for user
  const initializeOnboarding = useCallback(async () => {
    if (!user?.id || !organization?.id || !membership?.role) return;

    const roleSteps = getStepsForRole();
    setAvailableSteps(roleSteps);

    // Check if progress exists
    const { data: existingProgress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (!existingProgress) {
      // Create initial progress record
      await supabase.from('onboarding_progress').insert({
        organization_id: organization.id,
        user_id: user.id,
        user_role: membership.role,
        total_steps: roleSteps.length,
        completed_steps: 0,
        skipped_steps: 0,
        is_completed: false,
        started_at: new Date().toISOString(),
      });

      // Create initial step records
      const stepRecords = roleSteps.map(step => ({
        organization_id: organization.id,
        user_id: user.id,
        user_role: membership.role,
        step_key: step.key,
        step_name: step.name,
        status: 'pending' as OnboardingStepStatus,
      }));

      await supabase.from('onboarding_analytics').insert(stepRecords);
    }

    await fetchProgress();
  }, [user?.id, organization?.id, membership?.role, getStepsForRole]);

  // Fetch current progress
  const fetchProgress = useCallback(async () => {
    if (!user?.id || !organization?.id) return;

    setLoading(true);
    try {
      const [progressResult, stepsResult] = await Promise.all([
        supabase
          .from('onboarding_progress')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('onboarding_analytics')
          .select('*')
          .eq('organization_id', organization.id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
      ]);

      if (progressResult.data) {
        setProgress({
          total_steps: progressResult.data.total_steps,
          completed_steps: progressResult.data.completed_steps,
          skipped_steps: progressResult.data.skipped_steps,
          is_completed: progressResult.data.is_completed,
          started_at: progressResult.data.started_at,
          completed_at: progressResult.data.completed_at,
        });
      }

      if (stepsResult.data) {
        setSteps(stepsResult.data as OnboardingStepProgress[]);
      }
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, organization?.id]);

  // Start a step
  const startStep = useCallback(async (stepKey: string) => {
    if (!user?.id || !organization?.id) return;

    await supabase
      .from('onboarding_analytics')
      .update({
        status: 'started',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .eq('step_key', stepKey);

    await fetchProgress();
  }, [user?.id, organization?.id, fetchProgress]);

  // Complete a step
  const completeStep = useCallback(async (stepKey: string) => {
    if (!user?.id || !organization?.id) return;

    const now = new Date().toISOString();

    // Update step status
    await supabase
      .from('onboarding_analytics')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .eq('step_key', stepKey);

    // Update progress
    const { data: currentProgress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (currentProgress) {
      const newCompletedSteps = currentProgress.completed_steps + 1;
      const isCompleted = newCompletedSteps + currentProgress.skipped_steps >= currentProgress.total_steps;

      await supabase
        .from('onboarding_progress')
        .update({
          completed_steps: newCompletedSteps,
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
          updated_at: now,
        })
        .eq('organization_id', organization.id)
        .eq('user_id', user.id);
    }

    await fetchProgress();
  }, [user?.id, organization?.id, fetchProgress]);

  // Skip a step
  const skipStep = useCallback(async (stepKey: string) => {
    if (!user?.id || !organization?.id) return;

    const now = new Date().toISOString();

    await supabase
      .from('onboarding_analytics')
      .update({
        status: 'skipped',
        skipped_at: now,
        updated_at: now,
      })
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .eq('step_key', stepKey);

    // Update progress
    const { data: currentProgress } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', user.id)
      .single();

    if (currentProgress) {
      const newSkippedSteps = currentProgress.skipped_steps + 1;
      const isCompleted = currentProgress.completed_steps + newSkippedSteps >= currentProgress.total_steps;

      await supabase
        .from('onboarding_progress')
        .update({
          skipped_steps: newSkippedSteps,
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
          updated_at: now,
        })
        .eq('organization_id', organization.id)
        .eq('user_id', user.id);
    }

    await fetchProgress();
  }, [user?.id, organization?.id, fetchProgress]);

  // Auto-complete step based on action
  const autoCompleteByAction = useCallback(async (action: string) => {
    const step = availableSteps.find(s => s.autoCompleteAction === action);
    if (step) {
      const stepProgress = steps.find(s => s.step_key === step.key);
      if (stepProgress && stepProgress.status !== 'completed') {
        await completeStep(step.key);
      }
    }
  }, [availableSteps, steps, completeStep]);

  // Initialize on mount
  useEffect(() => {
    if (user?.id && organization?.id && membership?.role) {
      initializeOnboarding();
    }
  }, [user?.id, organization?.id, membership?.role, initializeOnboarding]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id || !organization?.id) return;

    const channel = supabase
      .channel('onboarding-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, organization?.id, fetchProgress]);

  return {
    steps,
    progress,
    loading,
    availableSteps,
    startStep,
    completeStep,
    skipStep,
    autoCompleteByAction,
    refetch: fetchProgress,
  };
};

// Hook for super admin analytics
export const useAdminOnboardingAnalytics = () => {
  const [analytics, setAnalytics] = useState<{
    totalOrgs: number;
    completionRate: number;
    avgTimeToComplete: number;
    mostSkippedSteps: { step_key: string; count: number }[];
    dropOffPoints: { step_key: string; dropOffRate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Get all progress records
      const { data: progressData } = await supabase
        .from('onboarding_progress')
        .select('*');

      // Get all analytics records
      const { data: analyticsData } = await supabase
        .from('onboarding_analytics')
        .select('*');

      if (progressData && analyticsData) {
        const totalOrgs = new Set(progressData.map(p => p.organization_id)).size;
        const completedCount = progressData.filter(p => p.is_completed).length;
        const completionRate = progressData.length > 0 
          ? (completedCount / progressData.length) * 100 
          : 0;

        // Calculate average time to complete
        const completedWithTime = progressData.filter(p => p.is_completed && p.started_at && p.completed_at);
        const avgTimeToComplete = completedWithTime.length > 0
          ? completedWithTime.reduce((sum, p) => {
              const start = new Date(p.started_at!).getTime();
              const end = new Date(p.completed_at!).getTime();
              return sum + (end - start);
            }, 0) / completedWithTime.length / (1000 * 60 * 60) // Convert to hours
          : 0;

        // Most skipped steps
        const skippedCounts: Record<string, number> = {};
        analyticsData.forEach(a => {
          if (a.status === 'skipped') {
            skippedCounts[a.step_key] = (skippedCounts[a.step_key] || 0) + 1;
          }
        });
        const mostSkippedSteps = Object.entries(skippedCounts)
          .map(([step_key, count]) => ({ step_key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Drop-off points (steps where users stopped)
        const stepOrder = ['configure_branding', 'invite_team', 'add_customer', 'create_quotation', 'create_first_invoice', 'add_employee', 'configure_settings'];
        const dropOffPoints = stepOrder.map((stepKey, index) => {
          const stepAnalytics = analyticsData.filter(a => a.step_key === stepKey);
          const startedOrCompleted = stepAnalytics.filter(a => a.status === 'started' || a.status === 'completed').length;
          const nextStepKey = stepOrder[index + 1];
          const nextStepStarted = nextStepKey 
            ? analyticsData.filter(a => a.step_key === nextStepKey && (a.status === 'started' || a.status === 'completed')).length
            : startedOrCompleted;
          const dropOffRate = startedOrCompleted > 0 
            ? ((startedOrCompleted - nextStepStarted) / startedOrCompleted) * 100 
            : 0;
          return { step_key: stepKey, dropOffRate };
        });

        setAnalytics({
          totalOrgs,
          completionRate,
          avgTimeToComplete,
          mostSkippedSteps,
          dropOffPoints,
        });
      }
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, refetch: fetchAnalytics };
};
