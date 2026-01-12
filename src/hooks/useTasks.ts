import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';
import { toast } from 'sonner';
import { WorkflowStatus, WORKFLOW_STATUSES, getNextStatus, isDelivered } from '@/components/tasks/ProductionWorkflow';

export type TaskPriority = 'low' | 'medium' | 'high';

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
  assignee?: { full_name: string } | null;
}

export interface Employee {
  id: string;
  full_name: string;
}

export function useTasks() {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { organization } = useOrganization();
  const { hasPermission } = useOrgRolePermissions();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user has global tasks.view permission
  const hasTasksViewPermission = isSuperAdmin || isAdmin || hasPermission('tasks.view');

  const fetchTasks = useCallback(async () => {
    // Don't fetch without organization context
    if (!organization?.id) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch employees - scoped to organization
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('full_name');
      
      setEmployees(employeesData || []);

      // Fetch tasks - scoped to organization
      // RLS ensures org-level isolation, frontend handles visibility rules
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organization.id)
        .order('updated_at', { ascending: false });

      // VISIBILITY RULES:
      // 1. Super admin / Admin / Users with tasks.view permission: See ALL org tasks
      // 2. Other users: See only tasks they created OR are assigned to
      if (!hasTasksViewPermission && user?.id) {
        // User doesn't have global view permission
        // Show tasks where user is creator OR assignee
        query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id},assigned_by.eq.${user.id}`);
        console.log('[Tasks] Filtering for user visibility - created_by, assigned_to, or assigned_by:', user.id);
      } else {
        console.log('[Tasks] User has global view permission - showing all org tasks');
      }

      const { data: tasksData, error } = await query;

      if (error) {
        console.error('[Tasks] Error fetching tasks:', error);
        throw error;
      }

      console.log('[Tasks] Fetched tasks count:', tasksData?.length || 0);

      if (tasksData && employeesData) {
        const tasksWithEmployees = tasksData.map((task) => {
          const assignee = employeesData.find((e) => e.id === task.assigned_to);
          // Map old statuses to new workflow if needed
          let status = task.status as WorkflowStatus;
          if (!WORKFLOW_STATUSES.includes(status as any)) {
            // Fallback for old statuses
            if (task.status === 'todo') status = 'design';
            else if (task.status === 'in_progress') status = 'printing';
            else if (task.status === 'completed') status = 'delivered';
          }
          return {
            ...task,
            status,
            assignee: assignee ? { full_name: assignee.full_name } : null,
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
  }, [hasTasksViewPermission, user?.id, organization?.id]);

  // Real-time subscription
  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          // Refetch on any change
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const advanceStatus = useCallback(async (taskId: string, currentStatus: WorkflowStatus) => {
    if (isDelivered(currentStatus)) {
      toast.error('This task is already delivered');
      return false;
    }

    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return false;

    try {
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

      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`);
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return false;
    }
  }, []);

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
      
      const { data: newTask, error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description || null,
        assigned_to: data.assigned_to || null,
        assigned_by: currentUserId, // Set assigned_by to current user for backwards compatibility
        created_by: currentUserId, // CRITICAL: Set created_by to current user
        deadline: data.deadline || null,
        priority: data.priority,
        status: 'design',
        reference_type: data.reference_type || null,
        reference_id: data.reference_id || null,
        organization_id: organization?.id,
      }).select().single();

      if (error) {
        console.error('[Tasks] Error creating task:', error);
        throw error;
      }
      
      console.log('[Tasks] Task created successfully:', newTask?.id);
      
      // Immediately refetch to ensure the new task appears
      // The realtime subscription should also trigger this, but we do it explicitly for reliability
      await fetchTasks();
      
      toast.success('Task created successfully');
      return true;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
      return false;
    }
  }, [user?.id, organization?.id, fetchTasks]);

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
      const { error } = await supabase
        .from('tasks')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task updated');
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      return false;
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast.success('Task deleted');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
      return false;
    }
  }, []);

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
