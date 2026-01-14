import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrgRolePermissions } from "@/hooks/useOrgRolePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit2, Trash2, ArrowRight, Palette, Printer, Package, Truck, FileText, AlertTriangle, Lock, Globe, Building2 } from "lucide-react";
import { ReferenceSelect, ReferenceLink } from "@/components/tasks/ReferenceSelect";
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
  type WorkflowStatus 
} from "@/components/tasks/ProductionWorkflow";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskDueDateBadge, isTaskOverdue } from "@/components/tasks/TaskDueDateBadge";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const { tasks, employees, loading, advanceStatus, createTask, updateTask, deleteTask } = useTasks();
  
  // Permission checks for ACTIONS (not visibility - all org users can see all tasks)
  const canViewTasks = isSuperAdmin || hasPermission('tasks.view') || hasPermission('tasks.manage');
  const canCreateTasks = isSuperAdmin || hasPermission('tasks.create') || hasPermission('tasks.manage');
  const canEditTasks = isSuperAdmin || hasPermission('tasks.edit') || hasPermission('tasks.manage');
  const canDeleteTasks = isSuperAdmin || hasPermission('tasks.delete') || hasPermission('tasks.manage');
  const canAdvanceStatus = isSuperAdmin || hasPermission('tasks.edit') || hasPermission('tasks.manage');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    deadline: "",
    priority: "medium" as TaskPriority,
    visibility: "public" as TaskVisibility,
    department: "",
    reference_type: "" as "" | "invoice" | "challan" | "quotation",
    reference_id: "",
  });

  // Get unique departments from employees
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      return;
    }

    let success: boolean;
    if (editingTask) {
      success = await updateTask(editingTask.id, {
        title: formData.title,
        description: formData.description || undefined,
        assigned_to: formData.assigned_to || undefined,
        deadline: formData.deadline || undefined,
        priority: formData.priority,
        visibility: formData.visibility,
        department: formData.visibility === 'department' ? formData.department : undefined,
        reference_type: formData.reference_type || undefined,
        reference_id: formData.reference_id || undefined,
      });
    } else {
      success = await createTask({
        title: formData.title,
        description: formData.description || undefined,
        assigned_to: formData.assigned_to || undefined,
        deadline: formData.deadline || undefined,
        priority: formData.priority,
        visibility: formData.visibility,
        department: formData.visibility === 'department' ? formData.department : undefined,
        reference_type: formData.reference_type || undefined,
        reference_id: formData.reference_id || undefined,
      });
    }

    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      deadline: "",
      priority: "medium",
      visibility: "public",
      department: "",
      reference_type: "" as "" | "invoice" | "challan" | "quotation",
      reference_id: "",
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    if (isDelivered(task.status)) return;
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      deadline: task.deadline || "",
      priority: task.priority,
      visibility: task.visibility || "public",
      department: task.department || "",
      reference_type: (task.reference_type || "") as "" | "invoice" | "challan" | "quotation",
      reference_id: task.reference_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmTask) return;
    await deleteTask(deleteConfirmTask.id);
    setDeleteConfirmTask(null);
  };

  const handleAdvanceStatus = async (taskId: string, currentStatus: WorkflowStatus) => {
    await advanceStatus(taskId, currentStatus);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="animate-pulse">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">{priorityLabels[priority]}</Badge>;
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.assignee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || task.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, filterStatus]);

  // Status counts for summary cards
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    WORKFLOW_STATUSES.forEach(status => {
      counts[status] = tasks.filter(t => t.status === status).length;
    });
    return counts;
  }, [tasks]);

  const activeCount = tasks.filter(t => !isDelivered(t.status)).length;
  const deliveredCount = statusCounts['delivered'] || 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Production Tasks"
        description="Track jobs through the printing workflow"
        actions={
          canCreateTasks && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size={isMobile ? "sm" : "default"}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Title *</Label>
                    <Input
                      placeholder="e.g. Invoice #102 – Visiting Card"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes / Instructions</Label>
                    <Textarea
                      placeholder="Special instructions for this job..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select
                        value={formData.assigned_to}
                        onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Person" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline</Label>
                      <Input
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Link to Order (Optional)</Label>
                      <ReferenceSelect
                        referenceType={formData.reference_type}
                        referenceId={formData.reference_id}
                        onReferenceTypeChange={(type) => setFormData({ ...formData, reference_type: type })}
                        onReferenceIdChange={(id) => setFormData({ ...formData, reference_id: id })}
                      />
                    </div>
                  </div>

                  {/* Visibility Settings */}
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">Task Visibility</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Select
                          value={formData.visibility}
                          onValueChange={(v) => setFormData({ ...formData, visibility: v as TaskVisibility })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Public (All company users)
                              </div>
                            </SelectItem>
                            <SelectItem value="private">
                              <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Private (Creator & Assignee only)
                              </div>
                            </SelectItem>
                            <SelectItem value="department">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Department (Selected department only)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.visibility === 'department' && (
                        <div className="space-y-2">
                          <Select
                            value={formData.department}
                            onValueChange={(v) => setFormData({ ...formData, department: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                  {dept}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.visibility === 'public' && "Everyone in your company can see this task."}
                      {formData.visibility === 'private' && "Only you and the assigned person can see this task."}
                      {formData.visibility === 'department' && "Only users in the selected department can see this task."}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingTask ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Summary Cards */}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
      </div>

      {/* Tasks Table / Mobile Cards */}
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={searchTerm || filterStatus !== 'all' 
            ? "Try adjusting your search or filter" 
            : "Create your first production task to get started"}
          action={canCreateTasks ? { label: "New Task", onClick: () => setIsDialogOpen(true) } : undefined}
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
                        {canDeleteTask(task) && (
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
        <div className="border rounded-lg">
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
                        {task.reference_type && task.reference_id && (
                          <ReferenceLink referenceType={task.reference_type} referenceId={task.reference_id} />
                        )}
                        {!task.reference_type && task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
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
                        {canEdit && !taskIsDelivered && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(task)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteTask(task) && (
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
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        onAdvanceStatus={handleAdvanceStatus}
        canEdit={selectedTask ? canEditTask(selectedTask) : false}
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
    </div>
  );
};

export default Tasks;
