import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUsageAnalytics } from '@/hooks/useUsageAnalytics';
import { AlertTriangle, ArrowUpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UsageLimitBannerProps {
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const UsageLimitBanner: React.FC<UsageLimitBannerProps> = ({
  dismissible = true,
  onDismiss
}) => {
  const navigate = useNavigate();
  const { alerts, hasBlockedFeature, hasCriticalAlert, hasWarningAlert, loading } = useUsageAnalytics();

  if (loading || (!hasBlockedFeature && !hasCriticalAlert && !hasWarningAlert)) {
    return null;
  }

  const highestPriorityAlert = alerts.find(a => a.level === 'blocked') 
    || alerts.find(a => a.level === 'critical')
    || alerts.find(a => a.level === 'warning');

  if (!highestPriorityAlert) return null;

  const variant = hasBlockedFeature ? 'destructive' : 'default';
  const bgClass = hasBlockedFeature 
    ? 'border-destructive bg-destructive/5'
    : hasCriticalAlert
      ? 'border-orange-500 bg-orange-500/5'
      : 'border-yellow-500 bg-yellow-500/5';

  return (
    <Alert variant={variant} className={bgClass}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>
          {hasBlockedFeature 
            ? 'Usage Limit Reached'
            : hasCriticalAlert
              ? 'Approaching Usage Limit'
              : 'Usage Notice'
          }
        </span>
        {dismissible && onDismiss && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
        <span>
          {hasBlockedFeature
            ? `Your ${highestPriorityAlert.feature} limit has been reached. Upgrade to continue using this feature.`
            : `You've used ${highestPriorityAlert.percentage}% of your ${highestPriorityAlert.feature} limit.`
          }
        </span>
        <Button 
          variant={hasBlockedFeature ? 'default' : 'outline'} 
          size="sm"
          onClick={() => navigate('/pricing')}
        >
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Upgrade Plan
        </Button>
      </AlertDescription>
    </Alert>
  );
};
