import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WalkthroughStep {
  key: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  videoUrl?: string;
}

export interface PageWalkthrough {
  pageKey: string;
  steps: WalkthroughStep[];
}

// Define walkthroughs for different pages
const PAGE_WALKTHROUGHS: Record<string, WalkthroughStep[]> = {
  dashboard: [
    {
      key: 'dashboard_intro',
      title: 'Welcome to PrintoSaaS',
      description: 'Your printing business accounting hub. View key metrics, recent activities, and quick actions all in one place.',
      position: 'bottom',
    },
    {
      key: 'dashboard_stats',
      title: 'Key Metrics',
      description: 'These cards show your most important business metrics at a glance.',
      targetSelector: '[data-walkthrough="stats"]',
      position: 'bottom',
    },
  ],
  invoices: [
    {
      key: 'invoices_intro',
      title: 'Invoice Management',
      description: 'Create, manage, and track all your invoices from this page. Click "Create Invoice" to get started.',
      position: 'bottom',
    },
    {
      key: 'invoices_create',
      title: 'Create Your First Invoice',
      description: 'Click this button to create a new invoice for your customers.',
      targetSelector: '[data-walkthrough="create-invoice"]',
      position: 'left',
    },
  ],
  customers: [
    {
      key: 'customers_intro',
      title: 'Customer Management',
      description: 'Manage all your customer information here. Add new customers, view their history, and track outstanding payments.',
      position: 'bottom',
    },
  ],
  quotations: [
    {
      key: 'quotations_intro',
      title: 'Quotation System',
      description: 'Create professional quotations for your clients. Once approved, you can easily convert them to invoices.',
      position: 'bottom',
    },
  ],
  settings: [
    {
      key: 'settings_intro',
      title: 'Organization Settings',
      description: 'Configure your organization\'s details, branding, and preferences here.',
      position: 'bottom',
    },
  ],
};

export const useWalkthrough = (pageKey: string) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);

  const steps = PAGE_WALKTHROUGHS[pageKey] || [];

  // Fetch dismissed walkthroughs
  const fetchDismissals = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from('walkthrough_dismissals')
        .select('walkthrough_key')
        .eq('user_id', user.id);

      if (data) {
        setDismissedKeys(new Set(data.map(d => d.walkthrough_key)));
      }
    } catch (error) {
      console.error('Error fetching walkthrough dismissals:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check if walkthrough should show
  const shouldShowWalkthrough = useCallback(() => {
    if (loading || steps.length === 0) return false;
    const pageWalkthroughKey = `page_${pageKey}`;
    return !dismissedKeys.has(pageWalkthroughKey);
  }, [loading, steps.length, pageKey, dismissedKeys]);

  // Dismiss walkthrough for this page
  const dismissWalkthrough = useCallback(async () => {
    if (!user?.id) return;

    const pageWalkthroughKey = `page_${pageKey}`;
    
    try {
      await supabase.from('walkthrough_dismissals').insert({
        user_id: user.id,
        walkthrough_key: pageWalkthroughKey,
      });

      setDismissedKeys(prev => new Set([...prev, pageWalkthroughKey]));
      setIsActive(false);
      setCurrentStep(-1);
    } catch (error) {
      console.error('Error dismissing walkthrough:', error);
    }
  }, [user?.id, pageKey]);

  // Dismiss a specific step
  const dismissStep = useCallback(async (stepKey: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('walkthrough_dismissals').insert({
        user_id: user.id,
        walkthrough_key: stepKey,
      });

      setDismissedKeys(prev => new Set([...prev, stepKey]));
    } catch (error) {
      console.error('Error dismissing step:', error);
    }
  }, [user?.id]);

  // Start walkthrough
  const startWalkthrough = useCallback(() => {
    if (steps.length > 0) {
      setCurrentStep(0);
      setIsActive(true);
    }
  }, [steps.length]);

  // Next step
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      dismissWalkthrough();
    }
  }, [currentStep, steps.length, dismissWalkthrough]);

  // Previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // Skip all
  const skipAll = useCallback(() => {
    dismissWalkthrough();
  }, [dismissWalkthrough]);

  // Initialize on mount
  useEffect(() => {
    fetchDismissals();
  }, [fetchDismissals]);

  // Auto-start if should show
  useEffect(() => {
    if (!loading && shouldShowWalkthrough() && !isActive) {
      // Delay to allow page to render
      const timer = setTimeout(() => {
        startWalkthrough();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, shouldShowWalkthrough, isActive, startWalkthrough]);

  return {
    steps,
    currentStep,
    currentStepData: currentStep >= 0 ? steps[currentStep] : null,
    isActive,
    loading,
    startWalkthrough,
    nextStep,
    prevStep,
    skipAll,
    dismissStep,
    shouldShowWalkthrough,
  };
};
