import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GripVertical, User, Calendar, AlertTriangle } from "lucide-react";
import { 
  WORKFLOW_STATUSES, 
  WORKFLOW_LABELS, 
  WORKFLOW_ICONS,
  type WorkflowStatus, 
  type TaskStatus 
} from "./ProductionWorkflow";
import { Task, TaskPriority } from "@/hooks/useTasks";
import { TaskDueDateBadge, isTaskOverdue } from "./TaskDueDateBadge";
import { format } from "date-fns";

interface TaskKanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTransitionToStatus: (taskId: string, currentStatus: WorkflowStatus, targetStatus: WorkflowStatus) => Promise<boolean>;
  canAdvanceStatus: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  urgent: "border-l-destructive",
  high: "border-l-orange-500",
  medium: "border-l-primary",
  low: "border-l-muted-foreground/30",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export function TaskKanbanBoard({ tasks, onTaskClick, onTransitionToStatus, canAdvanceStatus }: TaskKanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<WorkflowStatus | null>(null);

  const getTasksByStatus = useCallback((status: WorkflowStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (!canAdvanceStatus) return;
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent, status: WorkflowStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: WorkflowStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedTask || !canAdvanceStatus) return;
    if (draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    await onTransitionToStatus(draggedTask.id, draggedTask.status as WorkflowStatus, targetStatus);
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 pb-4 min-w-max">
        {WORKFLOW_STATUSES.map((status) => {
          const columnTasks = getTasksByStatus(status);
          const Icon = WORKFLOW_ICONS[status];
          const isOver = dragOverColumn === status;

          return (
            <div
              key={status}
              className={cn(
                "flex flex-col w-[280px] min-w-[280px] rounded-lg border bg-muted/30 transition-colors",
                isOver && "border-primary bg-primary/5"
              )}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 p-3 border-b">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{WORKFLOW_LABELS[status]}</span>
                <Badge variant="secondary" className="ml-auto text-xs h-5 px-1.5">
                  {columnTasks.length}
                </Badge>
              </div>

              {/* Column Body */}
              <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-350px)] overflow-y-auto">
                {columnTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
                {columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    isDragging={draggedTask?.id === task.id}
                    canDrag={canAdvanceStatus}
                    onClick={() => onTaskClick(task)}
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

interface KanbanCardProps {
  task: Task;
  isDragging: boolean;
  canDrag: boolean;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function KanbanCard({ task, isDragging, canDrag, onClick, onDragStart, onDragEnd }: KanbanCardProps) {
  const overdue = isTaskOverdue(task.deadline, task.status);

  return (
    <Card
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "cursor-pointer border-l-4 transition-all hover:shadow-md",
        priorityColors[task.priority],
        isDragging && "opacity-50 rotate-2 scale-95",
        canDrag && "active:cursor-grabbing"
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <div className="flex items-start gap-1.5">
          {canDrag && (
            <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5 cursor-grab" />
          )}
          <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">
            {task.title}
          </p>
        </div>

        {/* Priority & Overdue */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority === "urgent" && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              Urgent
            </Badge>
          )}
          {task.priority === "high" && (
            <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] px-1.5 py-0 h-4">
              High
            </Badge>
          )}
          {overdue && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
              Overdue
            </Badge>
          )}
        </div>

        {/* Footer: Assignee & Deadline */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {task.assignee?.full_name ? (
            <div className="flex items-center gap-1 truncate max-w-[60%]">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{task.assignee.full_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/50">Unassigned</span>
          )}
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.deadline), "dd MMM")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
