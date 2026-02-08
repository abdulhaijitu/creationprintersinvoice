import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Globe, Building2, FileText, PenLine } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { MultiEmployeeSelect } from "./MultiEmployeeSelect";
import { InvoiceItemSelector } from "./InvoiceItemSelector";
import { Task, TaskPriority, TaskVisibility, Employee } from "@/hooks/useTasks";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTask: Task | null;
  employees: Employee[];
  departments: string[];
  canAssignTasks: boolean;
  canCreateTasks: boolean;
  onSubmit: (data: TaskFormData) => Promise<boolean>;
  onReset: () => void;
}

export interface TaskFormData {
  title: string;
  description: string;
  assignees: string[];
  deadline: string;
  priority: TaskPriority;
  visibility: TaskVisibility;
  department: string;
  jobMode: "manual" | "invoice";
  selectedInvoiceId: string;
  selectedInvoiceItemIds: string[];
}

const initialFormData: TaskFormData = {
  title: "",
  description: "",
  assignees: [],
  deadline: "",
  priority: "medium",
  visibility: "public",
  department: "",
  jobMode: "manual",
  selectedInvoiceId: "",
  selectedInvoiceItemIds: [],
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  editingTask,
  employees,
  departments,
  canAssignTasks,
  canCreateTasks,
  onSubmit,
  onReset,
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();

  // Reset form when dialog opens/closes or editing task changes
  useEffect(() => {
    if (open) {
      if (editingTask) {
        setFormData({
          title: editingTask.title,
          description: editingTask.description || "",
          assignees: editingTask.assigned_to ? [editingTask.assigned_to] : [],
          deadline: editingTask.deadline || "",
          priority: editingTask.priority,
          visibility: editingTask.visibility || "public",
          department: editingTask.department || "",
          jobMode: "manual",
          selectedInvoiceId: "",
          selectedInvoiceItemIds: [],
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [open, editingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.jobMode === "manual" && !formData.title.trim()) {
      return;
    }
    if (formData.jobMode === "invoice" && formData.selectedInvoiceItemIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success) {
        onOpenChange(false);
        onReset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onReset();
  };

  const isAssignmentDisabled = editingTask ? !canAssignTasks : !canCreateTasks;

  const title = editingTask ? "Edit Task" : "Create New Task";

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Title Mode Toggle - Only for new tasks */}
      {!editingTask && (
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Tabs
            value={formData.jobMode}
            onValueChange={(v) =>
              setFormData({ ...formData, jobMode: v as "manual" | "invoice" })
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="gap-2">
                <PenLine className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2">
                <FileText className="h-4 w-4" />
                From Invoice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-3">
              <Input
                placeholder="e.g. Visiting Card Printing"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </TabsContent>

            <TabsContent value="invoice" className="mt-3">
              <InvoiceItemSelector
                selectedInvoiceId={formData.selectedInvoiceId}
                selectedItemIds={formData.selectedInvoiceItemIds}
                onInvoiceChange={(id) =>
                  setFormData({ ...formData, selectedInvoiceId: id })
                }
                onItemsChange={(ids) =>
                  setFormData({ ...formData, selectedInvoiceItemIds: ids })
                }
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* For editing - show title input directly */}
      {editingTask && (
        <div className="space-y-2">
          <Label>Job Title *</Label>
          <Input
            placeholder="e.g. Visiting Card Printing"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>
      )}

      {/* Notes / Instructions - Rich Text */}
      <div className="space-y-2">
        <Label>Notes / Instructions</Label>
        <RichTextEditor
          value={formData.description}
          onChange={(val) => setFormData({ ...formData, description: val })}
          placeholder="Special instructions for this job..."
          minHeight="100px"
        />
      </div>

      {/* Assign To - Multi-select */}
      <div className="space-y-2">
        <Label>Assign To</Label>
        <MultiEmployeeSelect
          employees={employees}
          value={formData.assignees}
          onChange={(vals) => setFormData({ ...formData, assignees: vals })}
          disabled={isAssignmentDisabled}
          placeholder="Select assignees..."
        />
        {editingTask && !canAssignTasks && (
          <p className="text-xs text-muted-foreground">
            You don't have permission to change assignment
          </p>
        )}
      </div>

      {/* Deadline & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Deadline</Label>
          <Input
            type="date"
            value={formData.deadline}
            onChange={(e) =>
              setFormData({ ...formData, deadline: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) =>
              setFormData({ ...formData, priority: v as TaskPriority })
            }
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
      </div>

      {/* Visibility Settings */}
      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
        <Label className="text-sm font-medium">Task Visibility</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Select
              value={formData.visibility}
              onValueChange={(v) =>
                setFormData({ ...formData, visibility: v as TaskVisibility })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
                <SelectItem value="department">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Department
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.visibility === "department" && (
            <div className="space-y-2">
              <Select
                value={formData.department}
                onValueChange={(v) =>
                  setFormData({ ...formData, department: v })
                }
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
          {formData.visibility === "public" &&
            "Everyone in your company can see this task."}
          {formData.visibility === "private" &&
            "Only you and the assigned person(s) can see this task."}
          {formData.visibility === "department" &&
            "Only users in the selected department can see this task."}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : editingTask
              ? "Update"
              : formData.jobMode === "invoice" && formData.selectedInvoiceItemIds.length > 1
                ? `Create ${formData.selectedInvoiceItemIds.length} Tasks`
                : "Create"}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing when clicking inside portaled popovers
          const target = e.target as HTMLElement;
          if (target?.closest('[data-radix-popper-content-wrapper]') || target?.closest('[role="listbox"]') || target?.closest('[cmdk-list]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target?.closest('[data-radix-popper-content-wrapper]') || target?.closest('[role="listbox"]') || target?.closest('[cmdk-list]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
