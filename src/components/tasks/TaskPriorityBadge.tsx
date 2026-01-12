import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowDown, ArrowUp, Flame } from 'lucide-react';

export type TaskPriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

// SLA durations in hours based on priority
export const SLA_DURATIONS: Record<TaskPriorityLevel, number> = {
  low: 72,
  medium: 48,
  high: 24,
  urgent: 8,
};

export const PRIORITY_LABELS: Record<TaskPriorityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

interface TaskPriorityBadgeProps {
  priority: TaskPriorityLevel | string;
  showIcon?: boolean;
  compact?: boolean;
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  showIcon = true,
  compact = false,
  className,
}: TaskPriorityBadgeProps) {
  // Normalize priority
  const normalizedPriority = (priority as TaskPriorityLevel) || 'medium';

  const config = {
    low: {
      variant: 'outline' as const,
      icon: ArrowDown,
      className: 'border-muted-foreground/30 text-muted-foreground',
    },
    medium: {
      variant: 'secondary' as const,
      icon: null,
      className: '',
    },
    high: {
      variant: 'default' as const,
      icon: ArrowUp,
      className: 'bg-orange-500 hover:bg-orange-600 text-white',
    },
    urgent: {
      variant: 'destructive' as const,
      icon: Flame,
      className: 'animate-pulse',
    },
  };

  const { variant, icon: Icon, className: priorityClassName } = config[normalizedPriority] || config.medium;

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1',
        priorityClassName,
        compact && 'text-xs px-1.5 py-0',
        className
      )}
    >
      {showIcon && Icon && <Icon className={cn('h-3 w-3', normalizedPriority === 'urgent' && 'animate-bounce')} />}
      {!compact && PRIORITY_LABELS[normalizedPriority]}
      {compact && PRIORITY_LABELS[normalizedPriority].charAt(0)}
    </Badge>
  );
}

// Utility to calculate SLA deadline from creation time
export function calculateSlaDeadline(createdAt: string | Date, priority: TaskPriorityLevel): Date {
  const created = new Date(createdAt);
  const hours = SLA_DURATIONS[priority] || SLA_DURATIONS.medium;
  return new Date(created.getTime() + hours * 60 * 60 * 1000);
}

// Utility to get SLA status
export type SlaStatus = 'on_track' | 'warning' | 'breached';

export function getSlaStatus(
  slaDeadline: string | Date | null,
  taskStatus: string
): { status: SlaStatus; percentElapsed: number; timeRemaining: string } {
  // Completed tasks are always on track
  if (taskStatus === 'delivered' || taskStatus === 'completed') {
    return { status: 'on_track', percentElapsed: 0, timeRemaining: 'Completed' };
  }

  if (!slaDeadline) {
    return { status: 'on_track', percentElapsed: 0, timeRemaining: 'No SLA' };
  }

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const msRemaining = deadline.getTime() - now.getTime();

  // Calculate time remaining string
  let timeRemaining: string;
  if (msRemaining <= 0) {
    const hoursOverdue = Math.abs(Math.floor(msRemaining / (1000 * 60 * 60)));
    if (hoursOverdue < 1) {
      timeRemaining = 'Just breached';
    } else if (hoursOverdue < 24) {
      timeRemaining = `${hoursOverdue}h overdue`;
    } else {
      const daysOverdue = Math.floor(hoursOverdue / 24);
      timeRemaining = `${daysOverdue}d overdue`;
    }
    return { status: 'breached', percentElapsed: 100, timeRemaining };
  }

  // Calculate hours remaining
  const hoursRemaining = msRemaining / (1000 * 60 * 60);
  if (hoursRemaining < 1) {
    const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
    timeRemaining = `${minutesRemaining}m left`;
  } else if (hoursRemaining < 24) {
    timeRemaining = `${Math.floor(hoursRemaining)}h left`;
  } else {
    const daysRemaining = Math.floor(hoursRemaining / 24);
    const remainingHours = Math.floor(hoursRemaining % 24);
    timeRemaining = remainingHours > 0 ? `${daysRemaining}d ${remainingHours}h left` : `${daysRemaining}d left`;
  }

  // Calculate percent elapsed (approximate - we don't know exact start time without more context)
  // For status determination, we use fixed thresholds
  // Warning at 80% elapsed means 20% time remaining
  // We estimate based on typical SLA durations
  
  // Use a simpler approach: warning if less than 20% of typical SLA time remaining
  const warningThresholdHours = 4; // Less than 4 hours = warning for most priorities
  
  if (hoursRemaining <= warningThresholdHours) {
    return { status: 'warning', percentElapsed: 80, timeRemaining };
  }

  return { status: 'on_track', percentElapsed: 50, timeRemaining };
}
