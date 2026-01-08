import React from 'react';
import { useOnboardingAnalytics } from '@/hooks/useOnboardingAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, SkipForward, ChevronRight, X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  onDismiss?: () => void;
  compact?: boolean;
}

const stepRoutes: Record<string, string> = {
  configure_branding: '/white-label',
  invite_team: '/team-members',
  create_first_invoice: '/invoices/new',
  add_customer: '/customers',
  create_quotation: '/quotations/new',
  add_employee: '/employees',
  configure_settings: '/settings',
};

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  onDismiss,
  compact = false,
}) => {
  const navigate = useNavigate();
  const {
    steps,
    progress,
    loading,
    availableSteps,
    startStep,
    completeStep,
    skipStep,
  } = useOnboardingAnalytics();

  if (loading || !progress || progress.is_completed) {
    return null;
  }

  const progressPercentage = progress.total_steps > 0
    ? ((progress.completed_steps + progress.skipped_steps) / progress.total_steps) * 100
    : 0;

  const getStepStatus = (stepKey: string) => {
    const step = steps.find(s => s.step_key === stepKey);
    return step?.status || 'pending';
  };

  const handleStepClick = async (stepKey: string) => {
    const status = getStepStatus(stepKey);
    if (status === 'pending') {
      await startStep(stepKey);
    }
    const route = stepRoutes[stepKey];
    if (route) {
      navigate(route);
    }
  };

  const handleSkip = async (e: React.MouseEvent, stepKey: string) => {
    e.stopPropagation();
    await skipStep(stepKey);
  };

  if (compact) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Complete your setup</p>
                <p className="text-xs text-muted-foreground">
                  {progress.completed_steps} of {progress.total_steps} steps done
                </p>
              </div>
            </div>
            <Progress value={progressPercentage} className="w-24 h-2" />
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{progress.completed_steps} of {progress.total_steps} steps completed</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {availableSteps.map((step) => {
          const status = getStepStatus(step.key);
          const isCompleted = status === 'completed';
          const isSkipped = status === 'skipped';

          return (
            <div
              key={step.key}
              onClick={() => !isCompleted && !isSkipped && handleStepClick(step.key)}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-colors',
                isCompleted || isSkipped
                  ? 'bg-muted/50 border-muted'
                  : 'bg-card hover:bg-accent cursor-pointer border-border'
              )}
            >
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : isSkipped ? (
                  <SkipForward className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    (isCompleted || isSkipped) && 'text-muted-foreground line-through'
                  )}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!isCompleted && !isSkipped && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleSkip(e, step.key)}
                    className="text-xs"
                  >
                    Skip
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
