import { AlertTriangle, Clock, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useNavigate } from 'react-router-dom';

export const TrialBanner = () => {
  const { subscription, isSubscriptionActive, daysRemaining, isTrialExpired } = useOrganization();
  const navigate = useNavigate();

  if (!subscription) return null;
  
  // Don't show banner for active paid plans
  if (subscription.status === 'active' && subscription.plan !== 'free') return null;

  // Trial expired banner
  if (isTrialExpired || subscription.status === 'expired') {
    return (
      <Alert variant="destructive" className="mb-4 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Your free trial has ended</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your account is now in read-only mode. Upgrade to continue creating invoices, customers, and more.
          </span>
          <Button 
            size="sm" 
            className="ml-4 shrink-0"
            onClick={() => navigate('/pricing')}
          >
            <Zap className="h-4 w-4 mr-1" />
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning in last 3 days of trial
  if (subscription.status === 'trial' && daysRemaining !== null && daysRemaining <= 3) {
    return (
      <Alert className="mb-4 border-warning/50 bg-warning/10">
        <Clock className="h-4 w-4 text-warning" />
        <AlertTitle className="font-semibold text-warning">Trial ending soon</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {daysRemaining === 0 
              ? 'Your trial ends today!' 
              : `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`
            } Upgrade now to avoid losing access.
          </span>
          <Button 
            size="sm" 
            variant="outline"
            className="ml-4 shrink-0 border-warning text-warning hover:bg-warning/10"
            onClick={() => navigate('/pricing')}
          >
            <Zap className="h-4 w-4 mr-1" />
            Upgrade
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
