import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UsageProgressBarProps {
  feature: string;
  current: number;
  limit: number;
  percentage: number;
}

export const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
  feature,
  current,
  limit,
  percentage
}) => {
  const getStatusColor = () => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const getStatusText = () => {
    if (percentage >= 100) return 'Limit Reached';
    if (percentage >= 90) return 'Critical';
    if (percentage >= 70) return 'Warning';
    return 'Normal';
  };

  const formatFeatureName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{formatFeatureName(feature)}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {current} / {limit}
          </span>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            percentage >= 100 && "bg-destructive/10 text-destructive",
            percentage >= 90 && percentage < 100 && "bg-orange-500/10 text-orange-500",
            percentage >= 70 && percentage < 90 && "bg-yellow-500/10 text-yellow-500",
            percentage < 70 && "bg-primary/10 text-primary"
          )}>
            {percentage}%
          </span>
        </div>
      </div>
      <div className="relative">
        <Progress 
          value={Math.min(percentage, 100)} 
          className="h-2"
        />
        <div 
          className={cn(
            "absolute top-0 left-0 h-2 rounded-full transition-all",
            getStatusColor()
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {percentage >= 70 && (
        <p className={cn(
          "text-xs",
          percentage >= 100 && "text-destructive",
          percentage >= 90 && percentage < 100 && "text-orange-500",
          percentage >= 70 && percentage < 90 && "text-yellow-600"
        )}>
          {percentage >= 100 
            ? `You've reached your ${feature} limit. Please upgrade to continue.`
            : percentage >= 90
              ? `You're approaching your ${feature} limit. Consider upgrading soon.`
              : `You're using ${percentage}% of your ${feature} allowance.`
          }
        </p>
      )}
    </div>
  );
};
