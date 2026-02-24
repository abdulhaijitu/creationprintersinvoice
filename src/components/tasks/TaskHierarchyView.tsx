import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, FileText, Users, Calendar, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Task, TaskPriority } from '@/hooks/useTasks';
import { 
  ProductionStatusBadge, 
  getNextStatus, 
  isDelivered, 
  isArchived,
  type WorkflowStatus,
  type TaskStatus
} from './ProductionWorkflow';
import { TaskDueDateBadge } from './TaskDueDateBadge';

interface TaskHierarchyViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAdvanceStatus: (taskId: string, currentStatus: TaskStatus) => void;
  canAdvanceStatus: boolean;
}

interface TaskNode {
  task: Task;
  children: TaskNode[];
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted/50 text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

function TaskTreeItem({ 
  node, 
  level = 0, 
  onTaskClick, 
  onAdvanceStatus,
  canAdvanceStatus 
}: { 
  node: TaskNode; 
  level?: number;
  onTaskClick: (task: Task) => void;
  onAdvanceStatus: (taskId: string, currentStatus: TaskStatus) => void;
  canAdvanceStatus: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const task = node.task;
  const taskIsDelivered = isDelivered(task.status);
  const taskIsArchived = isArchived(task.status);
  const nextStatus = getNextStatus(task.status);

  // Calculate child status summary
  const childStatusSummary = useMemo(() => {
    if (!hasChildren) return null;
    const statuses = node.children.map(c => c.task.status);
    const completed = statuses.filter(s => isDelivered(s)).length;
    const inProgress = statuses.filter(s => !isDelivered(s) && !isArchived(s) && s !== 'design').length;
    return { completed, inProgress, total: statuses.length };
  }, [node.children, hasChildren]);

  return (
    <div className={cn("relative", level > 0 && "ml-6 border-l-2 border-muted pl-4")}>
      {/* Connection line for children */}
      {level > 0 && (
        <div className="absolute -left-[2px] top-4 w-4 h-px bg-muted" />
      )}
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card 
          className={cn(
            "mb-2 transition-all hover:shadow-md cursor-pointer",
            taskIsDelivered && "opacity-70",
            taskIsArchived && "opacity-50",
            hasChildren && "border-l-4 border-l-primary"
          )}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              {/* Expand/Collapse Button */}
              {hasChildren ? (
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 shrink-0 mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              ) : (
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Task Content */}
              <div 
                className="flex-1 min-w-0"
                onClick={() => onTaskClick(task)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm sm:text-base truncate">
                        {task.title}
                      </h4>
                      {(task as any).item_no && (
                        <Badge variant="outline" className="text-xs">
                          Item #{(task as any).item_no}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Meta info row */}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      {task.assignee?.full_name && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {task.assignee.full_name}
                        </span>
                      )}
                      {task.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.deadline), 'dd/MM/yyyy')}
                        </span>
                      )}
                      {childStatusSummary && (
                        <span className="flex items-center gap-1 text-primary">
                          {childStatusSummary.completed}/{childStatusSummary.total} completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <ProductionStatusBadge status={task.status} />
                      <Badge className={cn("text-xs", priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="sm:hidden">
                      <ProductionStatusBadge status={task.status} />
                    </div>
                    
                    {canAdvanceStatus && !taskIsDelivered && !taskIsArchived && nextStatus && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 hidden sm:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdvanceStatus(task.id, task.status);
                        }}
                      >
                        Next
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Task Due Date Badge */}
                <div className="mt-2">
                  <TaskDueDateBadge deadline={task.deadline} status={task.status} compact />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent className="mt-1">
            {node.children.map((childNode) => (
              <TaskTreeItem
                key={childNode.task.id}
                node={childNode}
                level={level + 1}
                onTaskClick={onTaskClick}
                onAdvanceStatus={onAdvanceStatus}
                canAdvanceStatus={canAdvanceStatus}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

export function TaskHierarchyView({ 
  tasks, 
  onTaskClick, 
  onAdvanceStatus,
  canAdvanceStatus 
}: TaskHierarchyViewProps) {
  // Build tree structure from flat task list
  const taskTree = useMemo(() => {
    const taskMap = new Map<string, TaskNode>();
    const rootNodes: TaskNode[] = [];

    // First pass: create all nodes
    tasks.forEach(task => {
      taskMap.set(task.id, { task, children: [] });
    });

    // Second pass: build parent-child relationships
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      const parentId = (task as any).parent_task_id;
      
      if (parentId && taskMap.has(parentId)) {
        const parentNode = taskMap.get(parentId)!;
        parentNode.children.push(node);
      } else if (!parentId) {
        // Only add to root if it's not a child task without a visible parent
        rootNodes.push(node);
      } else {
        // Parent not in current filtered list - show as root
        rootNodes.push(node);
      }
    });

    // Sort children by item_no if available
    taskMap.forEach(node => {
      node.children.sort((a, b) => {
        const aNo = (a.task as any).item_no || 0;
        const bNo = (b.task as any).item_no || 0;
        return aNo - bNo;
      });
    });

    return rootNodes;
  }, [tasks]);

  // Separate parent tasks (with children) from standalone tasks
  const { parentTasks, standaloneTasks } = useMemo(() => {
    const parents: TaskNode[] = [];
    const standalone: TaskNode[] = [];

    taskTree.forEach(node => {
      if (node.children.length > 0) {
        parents.push(node);
      } else {
        standalone.push(node);
      }
    });

    return { parentTasks: parents, standaloneTasks: standalone };
  }, [taskTree]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Parent Tasks with Children (Hierarchy View) */}
      {parentTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
            Invoice-based Tasks ({parentTasks.length})
          </div>
          <div className="space-y-2">
            {parentTasks.map((node) => (
              <TaskTreeItem
                key={node.task.id}
                node={node}
                onTaskClick={onTaskClick}
                onAdvanceStatus={onAdvanceStatus}
                canAdvanceStatus={canAdvanceStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* Standalone Tasks */}
      {standaloneTasks.length > 0 && (
        <div className="space-y-2">
          {parentTasks.length > 0 && (
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Individual Tasks ({standaloneTasks.length})
            </div>
          )}
          <div className="space-y-2">
            {standaloneTasks.map((node) => (
              <TaskTreeItem
                key={node.task.id}
                node={node}
                onTaskClick={onTaskClick}
                onAdvanceStatus={onAdvanceStatus}
                canAdvanceStatus={canAdvanceStatus}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
