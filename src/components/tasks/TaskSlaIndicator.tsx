import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getSlaStatus, SlaStatus, PRIORITY_LABELS, SLA_DURATIONS, type TaskPriorityLevel } from './TaskPriorityBadge';
import { format } from 'date-fns';

interface TaskSlaIndicatorProps {
  slaDeadline: string | null;
  taskStatus: string;
  priority?: TaskPriorityLevel | string;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function TaskSlaIndicator({
  slaDeadline,
  taskStatus,
  priority = 'medium',
  compact = false,
  showTooltip = true,
  className,
}: TaskSlaIndicatorProps) {
  // Don't show SLA for completed tasks
  if (taskStatus === 'delivered' || taskStatus === 'completed') {
    if (compact) return null;
    return (
      <Badge variant="outline" className={cn('gap-1 text-success border-success/30', className)}>
        <CheckCircle2 className="h-3 w-3" />
        {!compact && 'Completed'}
      </Badge>
    );
  }

  if (!slaDeadline) {
    return null;
  }

  const { status, timeRemaining } = getSlaStatus(slaDeadline, taskStatus);

  const config: Record<SlaStatus, { icon: typeof Clock; className: string; label: string }> = {
    on_track: {
      icon: Clock,
      className: 'bg-muted text-muted-foreground border-muted-foreground/20',
      label: 'On Track',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-warning/10 text-warning border-warning/30',
      label: 'At Risk',
    },
    breached: {
      icon: XCircle,
      className: 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse',
      label: 'SLA Breached',
    },
  };

  const { icon: Icon, className: statusClassName, label } = config[status];

  const badge = (
    <Badge
      variant="outline"
      className={cn('gap-1', statusClassName, compact && 'text-xs px-1.5 py-0', className)}
    >
      <Icon className="h-3 w-3" />
      {compact ? timeRemaining : `${label} • ${timeRemaining}`}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const slaHours = SLA_DURATIONS[(priority as TaskPriorityLevel) || 'medium'];
  const deadlineDate = new Date(slaDeadline);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-medium">{PRIORITY_LABELS[(priority as TaskPriorityLevel) || 'medium']} Priority SLA</p>
            <p>Target: {slaHours} hours from creation</p>
            <p>Deadline: {format(deadlineDate, 'dd MMM yyyy, HH:mm')}</p>
            <p className={cn(status === 'breached' && 'text-destructive font-medium')}>
              Status: {label}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
