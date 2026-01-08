import React from 'react';
import { useSubscriptionEnforcement, LimitWarning } from '@/hooks/useSubscriptionEnforcement';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface LimitWarningBannerProps {
  dismissible?: boolean;
  className?: string;
}

export const LimitWarningBanner: React.FC<LimitWarningBannerProps> = ({ 
  dismissible = true,
  className 
}) => {
  const navigate = useNavigate();
  const { activeWarnings, loading } = useSubscriptionEnforcement();
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (loading || activeWarnings.length === 0) return null;

  const visibleWarnings = activeWarnings.filter(w => !dismissed.includes(w.type));
  
  if (visibleWarnings.length === 0) return null;

  const handleDismiss = (type: string) => {
    setDismissed(prev => [...prev, type]);
  };

  // Group by severity - show hard limits first
  const hardLimits = visibleWarnings.filter(w => w.level === 'hard');
  const softLimits = visibleWarnings.filter(w => w.level === 'soft');

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      users: 'Team Members',
      clients: 'Customers',
      invoices: 'Invoices',
    };
    return labels[type] || type;
  };

  const renderWarning = (warning: LimitWarning) => {
    const isHard = warning.level === 'hard';
    
    return (
      <Alert 
        key={warning.type} 
        variant={isHard ? 'destructive' : 'default'}
        className={`relative ${className}`}
      >
        {dismissible && !isHard && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => handleDismiss(warning.type)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isHard ? 'bg-destructive/20' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            {isHard ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <AlertTitle className="text-sm font-semibold">
                {isHard ? `${getTypeLabel(warning.type)} Limit Reached` : `${getTypeLabel(warning.type)} Limit Warning`}
              </AlertTitle>
              <AlertDescription className="text-sm mt-1">
                {warning.message}
              </AlertDescription>
            </div>
            
            {warning.limit && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{warning.current} of {warning.limit} used</span>
                  <span>{warning.percentage}%</span>
                </div>
                <Progress 
                  value={warning.percentage} 
                  className={`h-2 ${isHard ? '[&>div]:bg-destructive' : '[&>div]:bg-amber-500'}`}
                />
              </div>
            )}
            
            <Button 
              size="sm" 
              onClick={() => navigate('/pricing')}
              variant={isHard ? 'default' : 'outline'}
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <div className="space-y-3">
      {hardLimits.map(renderWarning)}
      {softLimits.map(renderWarning)}
    </div>
  );
};
