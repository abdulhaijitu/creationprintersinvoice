import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { 
  WorkflowStepper, 
  ProductionStatusBadge, 
  getNextStatus,
  isDelivered,
  WORKFLOW_LABELS,
  type WorkflowStatus 
} from './ProductionWorkflow';
import { Task } from '@/hooks/useTasks';
import { ArrowRight, Calendar, User, AlertCircle, Lock, FileText } from 'lucide-react';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvanceStatus: (taskId: string, currentStatus: WorkflowStatus) => void;
  canEdit: boolean;
}

export function TaskDetailDrawer({ 
  task, 
  open, 
  onOpenChange, 
  onAdvanceStatus,
  canEdit 
}: TaskDetailDrawerProps) {
  if (!task) return null;

  const nextStatus = getNextStatus(task.status);
  const taskIsDelivered = isDelivered(task.status);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-lg sm:text-xl font-semibold truncate">
                {task.title}
              </DrawerTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ProductionStatusBadge status={task.status} />
                {getPriorityBadge(task.priority)}
                {taskIsDelivered && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Read-only
                  </Badge>
                )}
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">Close</Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Workflow Progress */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Production Progress</h3>
            <WorkflowStepper currentStatus={task.status} />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Assigned To
              </div>
              <p className="text-sm font-medium">
                {task.assignee?.full_name || 'Unassigned'}
              </p>
            </div>

            {task.deadline && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Deadline
                </div>
                <p className="text-sm font-medium">
                  {format(new Date(task.deadline), 'dd MMM yyyy')}
                </p>
              </div>
            )}

            {task.reference_type && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Reference
                </div>
                <p className="text-sm font-medium capitalize">
                  {task.reference_type}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Last Updated
              </div>
              <p className="text-sm font-medium">
                {format(new Date(task.updated_at), 'dd MMM yyyy, HH:mm')}
              </p>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Notes / Instructions</h3>
              <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t pt-4">
          {!taskIsDelivered && canEdit && nextStatus && (
            <Button 
              onClick={() => onAdvanceStatus(task.id, task.status)}
              className="w-full gap-2"
            >
              Move to {WORKFLOW_LABELS[nextStatus]}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {taskIsDelivered && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <AlertCircle className="h-4 w-4" />
              This task has been delivered and is now read-only
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
