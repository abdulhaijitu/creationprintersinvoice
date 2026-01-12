import { format } from 'date-fns';
import { 
  Clock, 
  Plus, 
  Edit, 
  UserPlus, 
  ArrowRight, 
  AlertTriangle, 
  Trash2,
  Loader2 
} from 'lucide-react';
import { useTaskActivityLogs, TaskActivityLog, TaskActivityType } from '@/hooks/useTaskActivityLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface TaskActivityTimelineProps {
  taskId: string | null;
}

const ACTION_CONFIG: Record<TaskActivityType, { 
  icon: typeof Plus; 
  label: string; 
  color: string;
}> = {
  created: { icon: Plus, label: 'Task Created', color: 'text-success' },
  updated: { icon: Edit, label: 'Task Updated', color: 'text-primary' },
  assigned: { icon: UserPlus, label: 'Assignment Changed', color: 'text-info' },
  status_changed: { icon: ArrowRight, label: 'Status Changed', color: 'text-warning' },
  priority_changed: { icon: AlertTriangle, label: 'Priority Changed', color: 'text-orange-500' },
  deleted: { icon: Trash2, label: 'Task Deleted', color: 'text-destructive' },
};

function getActivityDescription(log: TaskActivityLog): string {
  switch (log.action_type) {
    case 'created':
      return 'Created this task';
    case 'updated':
      return formatUpdateDescription(log);
    case 'assigned':
      return formatAssignmentDescription(log);
    case 'status_changed':
      return `Changed status from "${log.previous_value?.status || 'unknown'}" to "${log.new_value?.status || 'unknown'}"`;
    case 'priority_changed':
      return `Changed priority from "${log.previous_value?.priority || 'unknown'}" to "${log.new_value?.priority || 'unknown'}"`;
    case 'deleted':
      return 'Deleted this task';
    default:
      return 'Made changes to this task';
  }
}

function formatUpdateDescription(log: TaskActivityLog): string {
  const changes: string[] = [];
  
  if (log.previous_value?.title !== log.new_value?.title) {
    changes.push('title');
  }
  if (log.previous_value?.description !== log.new_value?.description) {
    changes.push('description');
  }
  if (log.previous_value?.deadline !== log.new_value?.deadline) {
    changes.push('deadline');
  }
  
  if (changes.length === 0) {
    return 'Updated task details';
  }
  
  return `Updated ${changes.join(', ')}`;
}

function formatAssignmentDescription(log: TaskActivityLog): string {
  const prevAssignee = log.previous_value?.assigned_to_name || 'Unassigned';
  const newAssignee = log.new_value?.assigned_to_name || 'Unassigned';
  
  if (!log.previous_value?.assigned_to) {
    return `Assigned task to ${newAssignee}`;
  }
  
  if (!log.new_value?.assigned_to) {
    return `Removed assignment from ${prevAssignee}`;
  }
  
  return `Reassigned from ${prevAssignee} to ${newAssignee}`;
}

export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const { logs, loading } = useTaskActivityLogs(taskId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4">
        {logs.map((log, index) => {
          const config = ACTION_CONFIG[log.action_type] || ACTION_CONFIG.updated;
          const Icon = config.icon;
          const isLast = index === logs.length - 1;

          return (
            <div key={log.id} className="relative flex gap-3">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-border" />
              )}
              
              {/* Icon */}
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border-2 border-muted ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-normal">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>
                <p className="text-sm mt-1">
                  {getActivityDescription(log)}
                </p>
                {log.performed_by_email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by {log.performed_by_email}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
