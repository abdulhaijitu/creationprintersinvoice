import { format, isToday, isPast, isTomorrow, differenceInDays } from 'date-fns';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaskDueDateBadgeProps {
  deadline: string | null;
  status?: string;
  compact?: boolean;
  showIcon?: boolean;
}

export type DueDateStatus = 'normal' | 'due_soon' | 'due_today' | 'overdue';

export function getDueDateStatus(deadline: string | null, taskStatus?: string): DueDateStatus {
  if (!deadline) return 'normal';
  
  // If task is delivered/completed, no urgency
  if (taskStatus === 'delivered' || taskStatus === 'completed') return 'normal';
  
  const dueDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
  if (isToday(dueDate)) return 'due_today';
  if (isTomorrow(dueDate) || differenceInDays(dueDate, today) <= 2) return 'due_soon';
  
  return 'normal';
}

export function TaskDueDateBadge({ 
  deadline, 
  status,
  compact = false,
  showIcon = true 
}: TaskDueDateBadgeProps) {
  if (!deadline) return null;

  const dueStatus = getDueDateStatus(deadline, status);
  const dueDate = new Date(deadline);
  const daysOverdue = Math.abs(differenceInDays(new Date(), dueDate));

  const getVariant = () => {
    switch (dueStatus) {
      case 'overdue':
        return 'destructive';
      case 'due_today':
        return 'default';
      case 'due_soon':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getLabel = () => {
    switch (dueStatus) {
      case 'overdue':
        return compact ? `${daysOverdue}d overdue` : `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;
      case 'due_today':
        return 'Due today';
      case 'due_soon':
        return isTomorrow(dueDate) ? 'Due tomorrow' : format(dueDate, 'MMM d');
      default:
        return format(dueDate, compact ? 'MMM d' : 'MMM d, yyyy');
    }
  };

  const getIcon = () => {
    switch (dueStatus) {
      case 'overdue':
        return AlertTriangle;
      case 'due_today':
        return Clock;
      default:
        return Calendar;
    }
  };

  const Icon = getIcon();

  return (
    <Badge 
      variant={getVariant()}
      className={cn(
        'gap-1',
        dueStatus === 'overdue' && 'animate-pulse',
        dueStatus === 'due_today' && 'bg-warning text-warning-foreground'
      )}
    >
      {showIcon && <Icon className={cn('h-3 w-3', compact && 'h-2.5 w-2.5')} />}
      <span className={cn(compact && 'text-xs')}>{getLabel()}</span>
    </Badge>
  );
}

// Utility function to check if a task is overdue
export function isTaskOverdue(deadline: string | null, taskStatus?: string): boolean {
  return getDueDateStatus(deadline, taskStatus) === 'overdue';
}
