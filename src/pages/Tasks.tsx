import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit2, Trash2, ArrowRight, Palette, Printer, Package, Truck, AlertTriangle, Lock, Globe, Building2, Archive, ArchiveRestore, RotateCcw, List, GitBranch, Columns3 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useTasks, Task, TaskPriority, TaskVisibility } from "@/hooks/useTasks";
import { 
  WorkflowStepper, 
  ProductionStatusBadge, 
  WORKFLOW_STATUSES, 
  WORKFLOW_LABELS,
  getNextStatus,
  isDelivered,
  isArchived,
  type WorkflowStatus,
  type TaskStatus
} from "@/components/tasks/ProductionWorkflow";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskDueDateBadge, isTaskOverdue } from "@/components/tasks/TaskDueDateBadge";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateTaskDialog, TaskFormData } from "@/components/tasks/CreateTaskDialog";
import { TaskHierarchyView } from "@/components/tasks/TaskHierarchyView";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const Tasks = () => {
  const { isSuperAdmin, user } = useAuth();
  const { hasPermission } = useOrgRolePermissions();
  const isMobile = useIsMobile();
  const { tasks, employees, loading, advanceStatus, transitionToStatus, createTask, createTasksFromInvoiceItems, updateTask, deleteTask, archiveTask, restoreTask } = useTasks();
  
  // Permission checks for ACTIONS (not visibility - all org users can see all tasks)
  const canViewTasks = isSuperAdmin || hasPermission('tasks.view') || hasPermission('tasks.manage');
  const canCreateTasks = isSuperAdmin || hasPermission('tasks.create') || hasPermission('tasks.manage');
  const canEditTasks = isSuperAdmin || hasPermission('tasks.edit') || hasPermission('tasks.manage');
  const canDeleteTasks = isSuperAdmin || hasPermission('tasks.delete') || hasPermission('tasks.manage');
  const canAdvanceStatus = isSuperAdmin || hasPermission('tasks.edit') || hasPermission('tasks.manage');
  const canAssignTasks = isSuperAdmin || hasPermission('tasks.assign') || hasPermission('tasks.manage');
  const canArchiveTasks = isSuperAdmin || hasPermission('tasks.bulk') || hasPermission('tasks.manage');
  const canViewArchivedTasks = isSuperAdmin || hasPermission('tasks.view') || hasPermission('tasks.manage');
  const canRestoreTasks = isSuperAdmin; // Only Super Admin can restore archived tasks
  
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [archiveConfirmTask, setArchiveConfirmTask] = useState<Task | null>(null);
  const [restoreConfirmTask, setRestoreConfirmTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "hierarchy" | "kanban">("list");

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const handleSubmit = async (formData: TaskFormData): Promise<boolean> => {
    if (editingTask) {
      // Update existing task
      const result = await updateTask(editingTask.id, {
        title: formData.title,
        description: formData.description || undefined,
        assigned_to: formData.assignees[0] || undefined,
        deadline: formData.deadline || undefined,
        priority: formData.priority,
        visibility: formData.visibility,
        department: formData.visibility === 'department' ? formData.department : undefined,
      });
      return !!result;
    } else {
      // Create new task(s)
      if (formData.jobMode === "invoice" && formData.selectedInvoiceItemIds.length > 0) {
        // Create tasks from invoice items
        const result = await createTasksFromInvoiceItems({
          invoiceItemIds: formData.selectedInvoiceItemIds,
          description: formData.description || undefined,
          assignees: formData.assignees.length > 0 ? formData.assignees : undefined,
          deadline: formData.deadline || undefined,
          priority: formData.priority,
          visibility: formData.visibility,
          department: formData.visibility === 'department' ? formData.department : undefined,
        });
        return !!result;
      } else {
        // Create single manual task
        const result = await createTask({
          title: formData.title,
          description: formData.description || undefined,
          assignees: formData.assignees.length > 0 ? formData.assignees : undefined,
          deadline: formData.deadline || undefined,
          priority: formData.priority,
          visibility: formData.visibility,
          department: formData.visibility === 'department' ? formData.department : undefined,
        });
        return !!result;
      }
    }
  };

  const resetForm = () => {
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    if (isDelivered(task.status) || isArchived(task.status)) return;
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmTask) return;
    await deleteTask(deleteConfirmTask.id);
    setDeleteConfirmTask(null);
  };

  const handleArchive = async () => {
    if (!archiveConfirmTask) return;
    await archiveTask(archiveConfirmTask.id);
    setArchiveConfirmTask(null);
  };

  const handleRestore = async () => {
    if (!restoreConfirmTask) return;
    await restoreTask(restoreConfirmTask.id);
    setRestoreConfirmTask(null);
  };

  const handleAdvanceStatus = async (taskId: string, currentStatus: TaskStatus) => {
    if (currentStatus === 'archived') return;
    await advanceStatus(taskId, currentStatus as WorkflowStatus);
  };

  const handleTransitionToStatus = async (taskId: string, currentStatus: WorkflowStatus, targetStatus: WorkflowStatus): Promise<boolean> => {
    const result = await transitionToStatus(taskId, currentStatus, targetStatus);
    return !!result;
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="animate-pulse">Urgent</Badge>;
      case "high":
        return <Badge className="bg-warning hover:bg-warning/90 text-warning-foreground">{priorityLabels[priority]}</Badge>;
      case "medium":
        return <Badge variant="secondary">{priorityLabels[priority]}</Badge>;
      default:
        return <Badge variant="outline">{priorityLabels[priority]}</Badge>;
    }
  };

  const getVisibilityBadge = (visibility: TaskVisibility) => {
    switch (visibility) {
      case "private":
        return <Badge variant="outline" className="gap-1 text-xs"><Lock className="h-3 w-3" />Private</Badge>;
      case "department":
        return <Badge variant="outline" className="gap-1 text-xs"><Building2 className="h-3 w-3" />Department</Badge>;
      default:
        return null; // Public tasks don't need a badge
    }
  };

  // Permission check for editing a task (based on permissions, not ownership)
  const canEditTask = (task: Task) => {
    if (isDelivered(task.status)) return false;
    // Creator and admin can always edit
    if (task.created_by === user?.id || isSuperAdmin) return true;
    return canEditTasks;
  };

  // Permission check for deleting a task
  const canDeleteTask = (task: Task) => {
    // Only creator or admin can delete
    if (task.created_by === user?.id || isSuperAdmin) return true;
    return canDeleteTasks;
  };

  // Separate active and archived tasks
  const activeTasks = useMemo(() => {
    return tasks.filter(t => !isArchived(t.status));
  }, [tasks]);

  const archivedTasks = useMemo(() => {
    return tasks.filter(t => isArchived(t.status));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const baseTasks = activeTab === "active" ? activeTasks : archivedTasks;
    return baseTasks.filter((task) => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // For archived tab, don't filter by status
      const matchesStatus = activeTab === "archived" || filterStatus === "all" || task.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [activeTasks, archivedTasks, activeTab, searchTerm, filterStatus]);

  // Status counts for summary cards (only active tasks)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WORKFLOW_STATUSES.forEach(status => {
      counts[status] = activeTasks.filter(t => t.status === status).length;
    });
    return counts;
  }, [activeTasks]);

  const activeCount = activeTasks.filter(t => !isDelivered(t.status) && !isArchived(t.status)).length;
  const deliveredCount = statusCounts['delivered'] || 0;
  const archivedCount = archivedTasks.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Production Tasks"
        description="Track jobs through the printing workflow"
        actions={
          canCreateTasks && (
            <Button 
              type="button"
              size={isMobile ? "sm" : "default"} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          )
        }
      />

      {/* Create/Edit Task Dialog */}
      <CreateTaskDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTask={editingTask}
        employees={employees}
        departments={departments}
        canAssignTasks={canAssignTasks}
        canCreateTasks={canCreateTasks}
        onSubmit={handleSubmit}
        onReset={resetForm}
      />

      {/* Summary Cards - 2-col tablet, 4-col desktop */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Printer className="h-4 w-4" />
              In Printing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{statusCounts['printing'] || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Packaging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{statusCounts['packaging'] || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{deliveredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Active/Archived */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Palette className="h-4 w-4" />
              Active Tasks
              <Badge variant="secondary" className="ml-1">{activeTasks.length}</Badge>
            </TabsTrigger>
            {canViewArchivedTasks && (
              <TabsTrigger value="archived" className="gap-2">
                <Archive className="h-4 w-4" />
                Archived
                <Badge variant="outline" className="ml-1">{archivedCount}</Badge>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Filters - responsive grid for tablet */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-0 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={activeTab === "active" ? "Search tasks..." : "Search archived tasks..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          {activeTab === "active" && (
            <>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {WORKFLOW_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {WORKFLOW_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/30">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setViewMode("kanban")}
                >
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button
                  variant={viewMode === "hierarchy" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => setViewMode("hierarchy")}
                >
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">Hierarchy</span>
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Active Tasks Content */}
        <TabsContent value="active" className="mt-0">
          {/* Tasks Table / Mobile Cards / Hierarchy View */}
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description={searchTerm || filterStatus !== 'all' 
                ? "Try adjusting your search or filter" 
                : "Create your first production task to get started"}
              action={canCreateTasks ? { label: "New Task", onClick: (e?: React.MouseEvent) => { e?.preventDefault(); e?.stopPropagation(); setIsDialogOpen(true); } } : undefined}
            />
          ) : viewMode === "kanban" ? (
            // Kanban Board View
            <TaskKanbanBoard
              tasks={filteredTasks}
              onTaskClick={setSelectedTask}
              onTransitionToStatus={handleTransitionToStatus}
              canAdvanceStatus={canAdvanceStatus}
            />
          ) : viewMode === "hierarchy" ? (
            // Hierarchy View
            <TaskHierarchyView
              tasks={filteredTasks}
              onTaskClick={setSelectedTask}
              onAdvanceStatus={handleAdvanceStatus}
              canAdvanceStatus={canAdvanceStatus}
            />
          ) : isMobile ? (
            // Mobile Card View
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const taskIsDelivered = isDelivered(task.status);
                const nextStatus = getNextStatus(task.status);
                const canEdit = canEditTask(task);

                return (
                  <Card 
                    key={task.id} 
                    className={`cursor-pointer transition-colors ${taskIsDelivered ? 'opacity-75' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{task.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.assignee?.full_name || 'Unassigned'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getPriorityBadge(task.priority)}
                          <TaskDueDateBadge deadline={task.deadline} status={task.status} compact />
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <WorkflowStepper currentStatus={task.status} compact />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <ProductionStatusBadge status={task.status} />
                        <div className="flex gap-1">
                          {canAdvanceStatus && !taskIsDelivered && nextStatus && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStatus(task.id, task.status);
                              }}
                            >
                              Next
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                          {/* Archive button for delivered tasks */}
                          {canArchiveTasks && taskIsDelivered && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setArchiveConfirmTask(task);
                              }}
                            >
                              <Archive className="h-3 w-3" />
                              Archive
                            </Button>
                          )}
                          {canEdit && !taskIsDelivered && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(task);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                          {canDeleteTask(task) && !taskIsDelivered && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmTask(task);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
        // Desktop Table View
        <div className="border rounded-lg overflow-x-auto">
          <div className="min-w-[900px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job / Task</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const taskIsDelivered = isDelivered(task.status);
                const nextStatus = getNextStatus(task.status);
                const canEdit = canEditTask(task);

                return (
                  <TableRow 
                    key={task.id} 
                    className={`cursor-pointer ${taskIsDelivered ? 'opacity-75' : ''}`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                    <TableCell>
                      <TaskDueDateBadge deadline={task.deadline} status={task.status} compact />
                    </TableCell>
                    <TableCell>
                      <WorkflowStepper currentStatus={task.status} compact />
                    </TableCell>
                    <TableCell>
                      <ProductionStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {canAdvanceStatus && !taskIsDelivered && nextStatus && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleAdvanceStatus(task.id, task.status)}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {WORKFLOW_LABELS[nextStatus]}
                          </Button>
                        )}
                        {/* Archive button for delivered tasks */}
                        {canArchiveTasks && taskIsDelivered && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setArchiveConfirmTask(task)}
                          >
                            <Archive className="h-3 w-3" />
                            Archive
                          </Button>
                        )}
                        {canEdit && !taskIsDelivered && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(task)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteTask(task) && !taskIsDelivered && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleteConfirmTask(task)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
          )}
        </TabsContent>

        {/* Archived Tasks Content */}
        {canViewArchivedTasks && (
          <TabsContent value="archived" className="mt-0">
            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                title="No archived tasks"
                description="Tasks that have been completed and archived will appear here"
              />
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job / Task</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Archived Date</TableHead>
                      <TableHead>Priority</TableHead>
                      {canRestoreTasks && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow 
                        key={task.id} 
                        className="opacity-60 cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{task.title}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                        <TableCell>
                          {task.archived_at 
                            ? format(new Date(task.archived_at), 'dd MMM yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                        {canRestoreTasks && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => setRestoreConfirmTask(task)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Restore
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onAdvanceStatus={handleAdvanceStatus}
        onTransitionToStatus={handleTransitionToStatus}
        canEdit={selectedTask ? canEditTask(selectedTask) && !isArchived(selectedTask.status) : false}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmTask}
        onOpenChange={(open) => !open && setDeleteConfirmTask(null)}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={!!archiveConfirmTask}
        onOpenChange={(open) => !open && setArchiveConfirmTask(null)}
        title="Archive Task"
        description={`Are you sure you want to archive "${archiveConfirmTask?.title}"? Archived tasks cannot be edited.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreConfirmTask}
        onOpenChange={(open) => !open && setRestoreConfirmTask(null)}
        title="Restore Task"
        description={`Are you sure you want to restore "${restoreConfirmTask?.title}"? It will be moved back to the active tasks list.`}
        confirmLabel="Restore"
        onConfirm={handleRestore}
      />
    </div>
  );
};

export default Tasks;
