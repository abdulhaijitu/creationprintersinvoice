import { useOrganization } from '@/contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCallback } from 'react';

export const useSubscriptionGuard = () => {
  const { isSubscriptionActive, isTrialExpired, subscription } = useOrganization();
  const navigate = useNavigate();

  const checkAccess = useCallback((action: string = 'perform this action') => {
    if (!isSubscriptionActive || isTrialExpired) {
      toast.error('Trial Expired', {
        description: `Your free trial has ended. Upgrade your plan to ${action}.`,
        action: {
          label: 'Upgrade',
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }
    return true;
  }, [isSubscriptionActive, isTrialExpired, navigate]);

  const guardedAction = useCallback(<T extends (...args: any[]) => any>(
    action: T,
    actionDescription?: string
  ): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
    return (...args: Parameters<T>) => {
      if (checkAccess(actionDescription)) {
        return action(...args);
      }
      return undefined;
    };
  }, [checkAccess]);

  return {
    isLocked: !isSubscriptionActive || isTrialExpired,
    checkAccess,
    guardedAction,
    subscription,
  };
};
