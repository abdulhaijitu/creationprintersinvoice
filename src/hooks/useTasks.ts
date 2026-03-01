/**
 * useTasks Hook - Task management with privacy and department visibility
 * 
 * VISIBILITY RULES (enforced by RLS):
 * - Public tasks: visible to all company users
 * - Private tasks: visible ONLY to creator and assignee
 * - Department tasks: visible to users in that department + creator + assignee
 * 
 * Priority: Private > Department > Public
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import { toast } from 'sonner';
import { WorkflowStatus, TaskStatus, WORKFLOW_STATUSES, getNextStatus, isDelivered, isArchived, canTransitionTo, getStatusIndex } from '@/components/tasks/ProductionWorkflow';
import { logTaskActivity, createTaskNotification } from './useTaskActivityLogs';
import { calculateSlaDeadline, type TaskPriorityLevel } from '@/components/tasks/TaskPriorityBadge';

export type TaskPriority = TaskPriorityLevel;
export type TaskVisibility = 'public' | 'private' | 'department';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_by: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  reference_type: string | null;
  reference_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  sla_deadline: string | null;
  sla_breached: boolean | null;
  visibility: TaskVisibility;
  department: string | null;
  archived_at: string | null;
  archived_by: string | null;
  parent_task_id: string | null;
  invoice_item_id: string | null;
  item_no: number | null;
  assignee?: { full_name: string } | null;
  creator?: { full_name: string; email: string } | null;
}

export interface Employee {
  id: string;
  full_name: string;
  email?: string;
  department?: string;
}

export function useTasks() {
  const { isSuperAdmin, user } = useAuth();
  const { organization } = useOrganization();
  const { hasPermission, loading: permissionsLoading } = useOrgRolePermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchCountRef = useRef(0);

  // PERMISSION GATE: Only show tasks if user has tasks.view permission
  // Note: This controls ACCESS to the task list, not visibility within it
  const canViewTasks = isSuperAdmin || hasPermission('tasks.view') || hasPermission('tasks.manage');

  const fetchTasks = useCallback(async () => {
    // Don't fetch without organization context or user
    if (!organization?.id || !user?.id) {
      setLoading(false);
      return;
    }

    // Wait for permissions to load
    if (permissionsLoading) {
      return;
    }

    const currentFetchCount = ++fetchCountRef.current;

    try {
      // Fetch employees with department - scoped to organization
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, email, department')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('full_name');

      setEmployees(employeesData || []);

      // Enforce view permission before showing any tasks
      if (!canViewTasks) {
        
        setTasks([]);
        return;
      }

      // VISIBILITY enforced by RLS (can_view_task function):
      // - Public tasks: all org users
      // - Private tasks: only creator + assignee
      // - Department tasks: only department users + creator + assignee
      

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('id, title, description, assigned_to, assigned_by, created_by, deadline, priority, status, reference_type, reference_id, completed_at, created_at, updated_at, sla_deadline, sla_breached, visibility, department, archived_at, archived_by, parent_task_id, invoice_item_id, item_no')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false });

      // Check if this is still the latest fetch
      if (currentFetchCount !== fetchCountRef.current) {
        return;
      }

      if (error) {
        console.error('[Tasks] Error fetching tasks:', error);
        throw error;
      }

      

      if (tasksData && employeesData) {
        const tasksWithEmployees = tasksData.map((task) => {
          const assignee = employeesData.find((e) => e.id === task.assigned_to);
          const creator = employeesData.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase());
          
          // Map old statuses to new workflow if needed
          let status = task.status as TaskStatus;
          if (!WORKFLOW_STATUSES.includes(status as any) && status !== 'archived') {
            if (task.status === 'todo') status = 'design';
            else if (task.status === 'in_progress') status = 'printing';
            else if (task.status === 'completed') status = 'delivered';
          }
          return {
            ...task,
            status,
            visibility: (task.visibility || 'public') as TaskVisibility,
            department: task.department || null,
            archived_at: (task as any).archived_at || null,
            archived_by: (task as any).archived_by || null,
            parent_task_id: task.parent_task_id || null,
            invoice_item_id: task.invoice_item_id || null,
            item_no: task.item_no || null,
            assignee: assignee ? { full_name: assignee.full_name } : null,
            creator: creator ? { full_name: creator.full_name, email: creator.email || '' } : null,
          };
        });
        setTasks(tasksWithEmployees as Task[]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [organization?.id, user?.id, user?.email, permissionsLoading, canViewTasks]);

  // Fetch tasks when permissions are ready
  useEffect(() => {
    if (!permissionsLoading) {
      fetchTasks();
    }
  }, [fetchTasks, permissionsLoading]);

  // Real-time subscription - separate from initial fetch
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel(`tasks-realtime-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organization.id}`
        },
        (() => {
          let throttleTimer: ReturnType<typeof setTimeout> | null = null;
          return () => {
            // Throttle realtime refetches to max once per 2 seconds
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
              throttleTimer = null;
              fetchTasks();
            }, 2000);
          };
        })()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, fetchTasks]);

  const advanceStatus = useCallback(async (taskId: string, currentStatus: WorkflowStatus) => {
    if (isDelivered(currentStatus)) {
      toast.error('This task is already delivered');
      return false;
    }

    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return false;

    try {
      // Get the current task for activity logging and notifications
      const currentTask = tasks.find(t => t.id === taskId);
      
      const updateData: { status: WorkflowStatus; updated_at: string; completed_at?: string } = {
        status: nextStatus,
        updated_at: new Date().toISOString()
      };

      if (nextStatus === 'delivered') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (organization?.id && user?.id) {
        await logTaskActivity({
          taskId,
          organizationId: organization.id,
          actionType: 'status_changed',
          previousValue: { status: currentStatus },
          newValue: { status: nextStatus },
          performedBy: user.id,
          performedByEmail: user.email,
        });

        // Notify creator and assignee about status change
        if (currentTask) {
          const usersToNotify = new Set<string>();
          if (currentTask.created_by) usersToNotify.add(currentTask.created_by);
          if (currentTask.assigned_to) usersToNotify.add(currentTask.assigned_to);
          
          for (const recipientId of usersToNotify) {
            await createTaskNotification({
              organizationId: organization.id,
              taskId,
              taskTitle: currentTask.title,
              type: 'task_status_changed',
              recipientUserId: recipientId,
              performedByUserId: user.id,
              message: `Task "${currentTask.title}" status changed to ${nextStatus.replace('_', ' ')}`,
            });
          }
        }
      }

      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return false;
    }
  }, [tasks, organization?.id, user?.id, user?.email]);

  /**
   * Transition to a specific workflow status with validation
   * Rules:
   * - Can move to completed steps (no database update, just view)
   * - Can move to immediate next step only
   * - Cannot skip steps
   */
  const transitionToStatus = useCallback(async (taskId: string, currentStatus: WorkflowStatus, targetStatus: WorkflowStatus) => {
    const currentIndex = getStatusIndex(currentStatus);
    const targetIndex = getStatusIndex(targetStatus);

    // Validate transition
    const { allowed, reason } = canTransitionTo(currentStatus, targetStatus);
    if (!allowed) {
      toast.error(reason || 'Invalid step transition');
      return false;
    }

    // If going backwards or same step, no database update needed
    if (targetIndex <= currentIndex) {
      return true;
    }

    // Only allow advancing to next immediate step
    if (targetIndex !== currentIndex + 1) {
      toast.error('Please complete previous step first');
      return false;
    }

    // Use the existing advanceStatus logic for forward transitions
    return await advanceStatus(taskId, currentStatus);
  }, [advanceStatus]);

  const createTask = useCallback(async (data: {
    title: string;
    description?: string;
    assigned_to?: string;
    assignees?: string[];
    deadline?: string;
    priority: TaskPriority;
    visibility?: TaskVisibility;
    department?: string;
    reference_type?: string;
    reference_id?: string;
    parent_task_id?: string;
    invoice_item_id?: string;
    item_no?: number;
  }) => {
    try {
      const currentUserId = user?.id;
      if (!organization?.id || !currentUserId) {
        toast.error('Missing organization or user context');
        return false;
      }

      // IMPORTANT:
      // - created_by references auth.users(id)
      // - assigned_by / assigned_to reference employees(id)
      // So we must store assigned_by as the current user's EMPLOYEE id (or null).
      const assignedByEmployeeId = (() => {
        const userEmail = user?.email?.toLowerCase();
        if (!userEmail) return null;
        const emp = employees.find((e) => e.email?.toLowerCase() === userEmail);
        return emp?.id ?? null;
      })();

      

      // Calculate SLA deadline based on priority
      const slaDeadline = calculateSlaDeadline(new Date(), data.priority as TaskPriorityLevel);

      // For multi-assign, use first assignee as primary (for backward compatibility)
      const primaryAssignee = data.assignees?.length ? data.assignees[0] : (data.assigned_to || null);

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: data.title,
          description: data.description || null,
          assigned_to: primaryAssignee,
          assigned_by: assignedByEmployeeId,
          created_by: currentUserId,
          deadline: data.deadline || null,
          priority: data.priority as any,
          status: 'design',
          visibility: data.visibility || 'public',
          department: data.visibility === 'department' ? (data.department || null) : null,
          reference_type: data.reference_type || null,
          reference_id: data.reference_id || null,
          organization_id: organization.id,
          sla_deadline: slaDeadline.toISOString(),
          parent_task_id: data.parent_task_id || null,
          invoice_item_id: data.invoice_item_id || null,
          item_no: data.item_no || null,
        } as any)
        .select()
        .single();

      if (error) {
        console.error('[Tasks] Error creating task:', error);
        throw error;
      }
      
      

      // Add multiple assignees to task_assignees table
      if (data.assignees && data.assignees.length > 0 && newTask) {
        const assigneeRecords = data.assignees.map(empId => ({
          task_id: newTask.id,
          employee_id: empId,
          assigned_by: currentUserId,
          organization_id: organization.id,
        }));

        const { error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assigneeRecords);

        if (assigneeError) {
          console.error('[Tasks] Error adding assignees:', assigneeError);
        }
      }

      // Log activity
      if (organization?.id && currentUserId && newTask) {
        await logTaskActivity({
          taskId: newTask.id,
          organizationId: organization.id,
          actionType: 'created',
          newValue: { 
            title: data.title, 
            priority: data.priority,
            visibility: data.visibility || 'public',
            department: data.department,
            assignees: data.assignees,
          },
          performedBy: currentUserId,
          performedByEmail: user?.email,
        });

        // Notify all assignees
        if (data.assignees && data.assignees.length > 0) {
          for (const assigneeId of data.assignees) {
            if (assigneeId !== currentUserId) {
              await createTaskNotification({
                organizationId: organization.id,
                taskId: newTask.id,
                taskTitle: data.title,
                type: 'task_assigned',
                recipientUserId: assigneeId,
                performedByUserId: currentUserId,
                message: `You have been assigned to task "${data.title}"`,
              });
            }
          }
        }
      }
      
      // Immediately refetch to ensure the new task appears
      await fetchTasks();
      
      toast.success('Task created successfully');
      return newTask?.id || true;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      return false;
    }
  }, [user?.id, user?.email, organization?.id, fetchTasks, employees]);

  /**
   * Create multiple tasks from invoice items
   */
  const createTasksFromInvoiceItems = useCallback(async (data: {
    invoiceItemIds: string[];
    description?: string;
    assignees?: string[];
    deadline?: string;
    priority: TaskPriority;
    visibility?: TaskVisibility;
    department?: string;
  }) => {
    try {
      const currentUserId = user?.id;
      if (!organization?.id || !currentUserId) {
        toast.error('Missing organization or user context');
        return false;
      }

      if (!data.invoiceItemIds.length) {
        toast.error('No invoice items selected');
        return false;
      }

      // Fetch invoice items details
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('id, description, invoice_id')
        .in('id', data.invoiceItemIds);

      if (itemsError) throw itemsError;

      // Get invoice info
      const invoiceIds = [...new Set(itemsData?.map(item => item.invoice_id) || [])];
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .in('id', invoiceIds);

      const invoiceMap = new Map(invoiceData?.map(inv => [inv.id, inv.invoice_number]) || []);

      // Create parent task if multiple items
      let parentTaskId: string | null = null;
      if (data.invoiceItemIds.length > 1) {
        const firstInvoiceId = itemsData?.[0]?.invoice_id;
        const invoiceNumber = invoiceMap.get(firstInvoiceId || '') || 'Invoice';
        
        const result = await createTask({
          title: `${invoiceNumber} - ${data.invoiceItemIds.length} Items`,
          description: data.description,
          assignees: data.assignees,
          deadline: data.deadline,
          priority: data.priority,
          visibility: data.visibility,
          department: data.department,
        });

        if (typeof result === 'string') {
          parentTaskId = result;
        } else if (!result) {
          return false;
        }
      }

      // Create individual tasks for each item
      for (let i = 0; i < (itemsData || []).length; i++) {
        const item = itemsData![i];
        const invoiceNumber = invoiceMap.get(item.invoice_id) || 'Invoice';
        
        // Extract plain text from HTML description
        const plainDesc = item.description.replace(/<[^>]*>/g, ' ').trim().slice(0, 100);
        const title = `${invoiceNumber} - Item ${i + 1}: ${plainDesc}`;

        await createTask({
          title,
          description: data.description,
          assignees: data.assignees,
          deadline: data.deadline,
          priority: data.priority,
          visibility: data.visibility,
          department: data.department,
          parent_task_id: parentTaskId || undefined,
          invoice_item_id: item.id,
          item_no: i + 1,
        });
      }

      toast.success(`Created ${data.invoiceItemIds.length} task(s) from invoice items`);
      return true;
    } catch (error) {
      console.error('Error creating tasks from invoice items:', error);
      toast.error('Failed to create tasks');
      return false;
    }
  }, [organization?.id, user?.id, createTask]);

  const updateTask = useCallback(async (taskId: string, data: {
    title?: string;
    description?: string;
    assigned_to?: string;
    deadline?: string;
    priority?: TaskPriority;
    visibility?: TaskVisibility;
    department?: string;
    reference_type?: string;
    reference_id?: string;
  }) => {
    try {
      // Get current task state for comparison
      const currentTask = tasks.find(t => t.id === taskId);
      const previousAssignee = currentTask?.assigned_to;
      const previousPriority = currentTask?.priority;

      const { error } = await supabase
        .from('tasks')
        .update({
          ...data,
          priority: data.priority as any, // Cast to any until types are regenerated
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', taskId);

      if (error) throw error;

      // Log activities and send notifications
      if (organization?.id && user?.id && currentTask) {
        // Check for assignment change
        if (data.assigned_to !== undefined && data.assigned_to !== previousAssignee) {
          const prevAssigneeName = employees.find(e => e.id === previousAssignee)?.full_name;
          const newAssigneeName = employees.find(e => e.id === data.assigned_to)?.full_name;

          await logTaskActivity({
            taskId,
            organizationId: organization.id,
            actionType: 'assigned',
            previousValue: { 
              assigned_to: previousAssignee,
              assigned_to_name: prevAssigneeName || 'Unassigned',
            },
            newValue: { 
              assigned_to: data.assigned_to,
              assigned_to_name: newAssigneeName || 'Unassigned',
            },
            performedBy: user.id,
            performedByEmail: user.email,
          });

          // Notify new assignee
          if (data.assigned_to) {
            await createTaskNotification({
              organizationId: organization.id,
              taskId,
              taskTitle: currentTask.title,
              type: previousAssignee ? 'task_reassigned' : 'task_assigned',
              recipientUserId: data.assigned_to,
              performedByUserId: user.id,
              message: previousAssignee 
                ? `Task "${currentTask.title}" has been reassigned to you`
                : `You have been assigned to task "${currentTask.title}"`,
            });
          }

          // Notify previous assignee about reassignment
          if (previousAssignee && previousAssignee !== data.assigned_to) {
            await createTaskNotification({
              organizationId: organization.id,
              taskId,
              taskTitle: currentTask.title,
              type: 'task_reassigned',
              recipientUserId: previousAssignee,
              performedByUserId: user.id,
              message: `Task "${currentTask.title}" has been reassigned to ${newAssigneeName || 'someone else'}`,
            });
          }
        }

        // Check for priority change - also recalculate SLA
        if (data.priority && data.priority !== previousPriority) {
          // Recalculate SLA deadline based on new priority (from original creation time)
          const newSlaDeadline = calculateSlaDeadline(currentTask.created_at, data.priority as TaskPriorityLevel);
          
          // Update SLA deadline in database
          await supabase
            .from('tasks')
            .update({ 
              sla_deadline: newSlaDeadline.toISOString(),
              sla_breached: false, // Reset breach status on priority change
              sla_warning_sent: false,
              sla_breach_sent: false,
            })
            .eq('id', taskId);

          await logTaskActivity({
            taskId,
            organizationId: organization.id,
            actionType: 'priority_changed',
            previousValue: { priority: previousPriority },
            newValue: { priority: data.priority },
            performedBy: user.id,
            performedByEmail: user.email,
          });
        }

        // Log general update if other fields changed
        const hasOtherChanges = 
          (data.title && data.title !== currentTask.title) ||
          (data.description !== undefined && data.description !== currentTask.description) ||
          (data.deadline && data.deadline !== currentTask.deadline);

        if (hasOtherChanges) {
          await logTaskActivity({
            taskId,
            organizationId: organization.id,
            actionType: 'updated',
            previousValue: {
              title: currentTask.title,
              description: currentTask.description,
              deadline: currentTask.deadline,
            },
            newValue: {
              title: data.title || currentTask.title,
              description: data.description !== undefined ? data.description : currentTask.description,
              deadline: data.deadline || currentTask.deadline,
            },
            performedBy: user.id,
            performedByEmail: user.email,
          });
        }
      }

      toast.success('Task updated');
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return false;
    }
  }, [tasks, employees, organization?.id, user?.id, user?.email]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);

      // Log deletion before deleting (since cascade will delete the log too if we do it after)
      if (organization?.id && user?.id && currentTask) {
        await logTaskActivity({
          taskId,
          organizationId: organization.id,
          actionType: 'deleted',
          previousValue: { title: currentTask.title },
          performedBy: user.id,
          performedByEmail: user.email,
        });
      }

      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success('Task deleted');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }
  }, [tasks, organization?.id, user?.id, user?.email]);

  /**
   * Archive a task (move from delivered to archived)
   */
  const archiveTask = useCallback(async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      
      if (!currentTask) {
        toast.error('Task not found');
        return false;
      }

      if (currentTask.status !== 'delivered') {
        toast.error('Only delivered tasks can be archived');
        return false;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: user?.id,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (organization?.id && user?.id) {
        await logTaskActivity({
          taskId,
          organizationId: organization.id,
          actionType: 'archived' as any,
          previousValue: { status: 'delivered' },
          newValue: { status: 'archived' },
          performedBy: user.id,
          performedByEmail: user.email,
        });
      }

      toast.success('Task archived successfully');
      return true;
    } catch (error) {
      console.error('Error archiving task:', error);
      toast.error('Failed to archive task');
      return false;
    }
  }, [tasks, organization?.id, user?.id, user?.email]);

  /**
   * Restore a task from archived to delivered (Super Admin only)
   */
  const restoreTask = useCallback(async (taskId: string) => {
    try {
      const currentTask = tasks.find(t => t.id === taskId);
      
      if (!currentTask) {
        toast.error('Task not found');
        return false;
      }

      if (currentTask.status !== 'archived') {
        toast.error('Only archived tasks can be restored');
        return false;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'delivered',
          archived_at: null,
          archived_by: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      if (organization?.id && user?.id) {
        await logTaskActivity({
          taskId,
          organizationId: organization.id,
          actionType: 'restored' as any,
          previousValue: { status: 'archived' },
          newValue: { status: 'delivered' },
          performedBy: user.id,
          performedByEmail: user.email,
        });
      }

      toast.success('Task restored successfully');
      return true;
    } catch (error) {
      console.error('Error restoring task:', error);
      toast.error('Failed to restore task');
      return false;
    }
  }, [tasks, organization?.id, user?.id, user?.email]);

  return {
    tasks,
    employees,
    loading,
    advanceStatus,
    transitionToStatus,
    createTask,
    createTasksFromInvoiceItems,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    refetch: fetchTasks
  };
}
