/**
 * useTasks Hook - Task management with COMPANY-WIDE visibility
 * 
 * VISIBILITY RULES (NON-NEGOTIABLE):
 * - ALL users in the same organization can see ALL tasks
 * - Visibility is NOT filtered by role, created_by, or assigned_to
 * - Permissions only control ACTIONS (create, edit, delete)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import { toast } from 'sonner';
import { WorkflowStatus, WORKFLOW_STATUSES, getNextStatus, isDelivered } from '@/components/tasks/ProductionWorkflow';
import { logTaskActivity, createTaskNotification } from './useTaskActivityLogs';
import { calculateSlaDeadline, type TaskPriorityLevel } from '@/components/tasks/TaskPriorityBadge';

export type TaskPriority = TaskPriorityLevel;

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  created_by: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: WorkflowStatus;
  reference_type: string | null;
  reference_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  sla_deadline: string | null;
  sla_breached: boolean | null;
  assignee?: { full_name: string } | null;
  creator?: { full_name: string; email: string } | null;
}

export interface Employee {
  id: string;
  full_name: string;
  email?: string;
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
      console.log('[Tasks] Waiting for permissions to load...');
      return;
    }

    const currentFetchCount = ++fetchCountRef.current;

    try {
      // Fetch employees - scoped to organization (for Assign To dropdown and name resolution)
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('full_name');

      setEmployees(employeesData || []);

      // Enforce view permission before showing any tasks
      if (!canViewTasks) {
        console.log('[Tasks] Access denied: missing tasks.view permission');
        setTasks([]);
        return;
      }

      // COMPANY-WIDE VISIBILITY (NON-NEGOTIABLE):
      // Fetch ALL tasks for the organization - NO filtering by created_by or assigned_to
      // Permissions only control ACTIONS, not visibility
      console.log('[Tasks] Fetching ALL company tasks (company-wide visibility)');

      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false });

      // Check if this is still the latest fetch
      if (currentFetchCount !== fetchCountRef.current) {
        console.log('[Tasks] Stale fetch result, ignoring');
        return;
      }

      if (error) {
        console.error('[Tasks] Error fetching tasks:', error);
        throw error;
      }

      console.log('[Tasks] Fetched tasks count:', tasksData?.length || 0);

      if (tasksData && employeesData) {
        const tasksWithEmployees = tasksData.map((task) => {
          const assignee = employeesData.find((e) => e.id === task.assigned_to);
          const creator = employeesData.find((e) => e.email?.toLowerCase() === user?.email?.toLowerCase());
          
          // Map old statuses to new workflow if needed
          let status = task.status as WorkflowStatus;
          if (!WORKFLOW_STATUSES.includes(status as any)) {
            if (task.status === 'todo') status = 'design';
            else if (task.status === 'in_progress') status = 'printing';
            else if (task.status === 'completed') status = 'delivered';
          }
          return {
            ...task,
            status,
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
        (payload) => {
          console.log('[Tasks] Realtime update received:', payload.eventType);
          // Refetch on any change - permissions are already loaded at this point
          fetchTasks();
        }
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

  const createTask = useCallback(async (data: {
    title: string;
    description?: string;
    assigned_to?: string;
    deadline?: string;
    priority: TaskPriority;
    reference_type?: string;
    reference_id?: string;
  }) => {
    try {
      const currentUserId = user?.id;
      console.log('[Tasks] Creating task with created_by:', currentUserId);
      
      // Calculate SLA deadline based on priority
      const slaDeadline = calculateSlaDeadline(new Date(), data.priority as TaskPriorityLevel);
      
      const { data: newTask, error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description || null,
        assigned_to: data.assigned_to || null,
        assigned_by: currentUserId, // Set assigned_by to current user for backwards compatibility
        created_by: currentUserId, // CRITICAL: Set created_by to current user
        deadline: data.deadline || null,
        priority: data.priority as any, // Cast to any until types are regenerated
        status: 'design',
        reference_type: data.reference_type || null,
        reference_id: data.reference_id || null,
        organization_id: organization?.id,
        sla_deadline: slaDeadline.toISOString(),
      } as any).select().single();

      if (error) {
        console.error('[Tasks] Error creating task:', error);
        throw error;
      }
      
      console.log('[Tasks] Task created successfully:', newTask?.id);

      // Log activity
      if (organization?.id && currentUserId && newTask) {
        await logTaskActivity({
          taskId: newTask.id,
          organizationId: organization.id,
          actionType: 'created',
          newValue: { 
            title: data.title, 
            priority: data.priority,
            assigned_to: data.assigned_to,
          },
          performedBy: currentUserId,
          performedByEmail: user?.email,
        });

        // Notify assignee if different from creator
        if (data.assigned_to && data.assigned_to !== currentUserId) {
          const assigneeName = employees.find(e => e.id === data.assigned_to)?.full_name || 'someone';
          await createTaskNotification({
            organizationId: organization.id,
            taskId: newTask.id,
            taskTitle: data.title,
            type: 'task_assigned',
            recipientUserId: data.assigned_to,
            performedByUserId: currentUserId,
            message: `You have been assigned to task "${data.title}"`,
          });
        }
      }
      
      // Immediately refetch to ensure the new task appears
      await fetchTasks();
      
      toast.success('Task created successfully');
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      return false;
    }
  }, [user?.id, user?.email, organization?.id, fetchTasks, employees]);

  const updateTask = useCallback(async (taskId: string, data: {
    title?: string;
    description?: string;
    assigned_to?: string;
    deadline?: string;
    priority?: TaskPriority;
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

  return {
    tasks,
    employees,
    loading,
    advanceStatus,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks
  };
}
