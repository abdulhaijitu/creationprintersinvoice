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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  WorkflowStepper, 
  ProductionStatusBadge, 
  getNextStatus,
  isDelivered,
  isArchived,
  WORKFLOW_LABELS,
  type WorkflowStatus,
  type TaskStatus
} from './ProductionWorkflow';
import { ReferenceLink } from './ReferenceSelect';
import { TaskActivityTimeline } from './TaskActivityTimeline';
import { TaskComments } from './TaskComments';
import { TaskDueDateBadge } from './TaskDueDateBadge';
import { TaskAttachments } from './TaskAttachments';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskSlaIndicator } from './TaskSlaIndicator';
import { Task, TaskVisibility } from '@/hooks/useTasks';
import { ArrowRight, Calendar, User, AlertCircle, Lock, Link, History, Info, MessageSquare, Paperclip, Globe, Building2 } from 'lucide-react';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdvanceStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onTransitionToStatus?: (taskId: string, currentStatus: WorkflowStatus, targetStatus: WorkflowStatus) => void;
  canEdit: boolean;
}

export function TaskDetailDrawer({ 
  task, 
  open, 
  onOpenChange, 
  onAdvanceStatus,
  onTransitionToStatus,
  canEdit 
}: TaskDetailDrawerProps) {
  if (!task) return null;

  const nextStatus = getNextStatus(task.status);
  const taskIsDelivered = isDelivered(task.status);
  const taskIsArchived = isArchived(task.status);
  const taskIsReadOnly = taskIsDelivered || taskIsArchived;

  const handleStepClick = (targetStatus: WorkflowStatus) => {
    if (taskIsArchived) return;
    if (onTransitionToStatus && !isArchived(task.status)) {
      onTransitionToStatus(task.id, task.status as WorkflowStatus, targetStatus);
    }
  };

  const getVisibilityBadge = (visibility: TaskVisibility) => {
    switch (visibility) {
      case "private":
        return <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" />Private</Badge>;
      case "department":
        return <Badge variant="outline" className="gap-1 text-xs"><Building2 className="h-3 w-3" />{task.department || 'Department'}</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-xs"><Globe className="h-3 w-3" />Public</Badge>;
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
                <TaskPriorityBadge priority={task.priority} />
                <TaskDueDateBadge deadline={task.deadline} status={task.status} compact />
                <TaskSlaIndicator 
                  slaDeadline={task.sla_deadline} 
                  taskStatus={task.status} 
                  priority={task.priority}
                  compact 
                />
                {getVisibilityBadge(task.visibility)}
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

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <Tabs defaultValue="details" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="details" className="gap-1.5">
                <Info className="h-4 w-4" />
                <span className="hidden sm:inline">Details</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5">
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Files</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Comments</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-0 flex-1">
              {/* Workflow Progress - Interactive Stepper */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Production Progress</h3>
                  {canEdit && !taskIsDelivered && (
                    <span className="text-xs text-muted-foreground">Click steps to advance</span>
                  )}
                </div>
                <WorkflowStepper 
                  currentStatus={task.status} 
                  interactive={canEdit && !taskIsDelivered}
                  onStepClick={handleStepClick}
                  disabled={taskIsDelivered}
                />
              </div>

              {/* SLA Status */}
              {task.sla_deadline && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">SLA Status</h3>
                  <TaskSlaIndicator 
                    slaDeadline={task.sla_deadline} 
                    taskStatus={task.status} 
                    priority={task.priority}
                  />
                </div>
              )}

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
                      Due Date
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {format(new Date(task.deadline), 'dd MMM yyyy')}
                      </p>
                      <TaskDueDateBadge deadline={task.deadline} status={task.status} compact showIcon={false} />
                    </div>
                  </div>
                )}

                {task.reference_type && task.reference_id && (
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link className="h-4 w-4" />
                      Linked Order
                    </div>
                    <ReferenceLink referenceType={task.reference_type} referenceId={task.reference_id} />
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
                  <div 
                    className="text-sm bg-muted/50 p-3 rounded-lg prose prose-sm max-w-none [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: task.description }}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 flex-1 min-h-[300px]">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Attachments</h3>
                <TaskAttachments 
                  taskId={task.id} 
                  taskCreatorId={task.created_by}
                  taskAssigneeId={task.assigned_to}
                />
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-0 flex-1 min-h-[300px]">
              <TaskComments taskId={task.id} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 flex-1">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Activity Log</h3>
                <TaskActivityTimeline taskId={task.id} />
              </div>
            </TabsContent>
          </Tabs>
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
