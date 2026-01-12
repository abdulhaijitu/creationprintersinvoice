import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export type TaskActivityType = 'created' | 'updated' | 'assigned' | 'status_changed' | 'priority_changed' | 'deleted';

export interface TaskActivityLog {
  id: string;
  task_id: string;
  organization_id: string | null;
  action_type: TaskActivityType;
  previous_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  performed_by: string | null;
  performed_by_email: string | null;
  created_at: string;
}

export function useTaskActivityLogs(taskId: string | null) {
  const { organization } = useOrganization();
  const [logs, setLogs] = useState<TaskActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!taskId || !organization?.id) {
      setLogs([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_activity_logs')
        .select('*')
        .eq('task_id', taskId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data || []) as TaskActivityLog[]);
    } catch (error) {
      console.error('[TaskActivityLogs] Error fetching logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, organization?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!taskId) return;

    fetchLogs();

    // Subscribe to realtime updates for this task's activity logs
    const channel = supabase
      .channel(`task-activity-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activity_logs',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

/**
 * Logs a task activity. Should be called after successful task operations.
 */
export async function logTaskActivity(params: {
  taskId: string;
  organizationId: string;
  actionType: TaskActivityType;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  performedBy: string;
  performedByEmail?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('task_activity_logs').insert({
      task_id: params.taskId,
      organization_id: params.organizationId,
      action_type: params.actionType,
      previous_value: params.previousValue || null,
      new_value: params.newValue || null,
      performed_by: params.performedBy,
      performed_by_email: params.performedByEmail || null,
    });

    if (error) {
      console.error('[TaskActivityLogs] Error logging activity:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[TaskActivityLogs] Error logging activity:', error);
    return false;
  }
}

/**
 * Creates a task notification for relevant users
 */
export async function createTaskNotification(params: {
  organizationId: string;
  taskId: string;
  taskTitle: string;
  type: 'task_assigned' | 'task_reassigned' | 'task_status_changed';
  recipientUserId: string;
  performedByUserId: string;
  message: string;
}): Promise<boolean> {
  // Don't notify the user who performed the action
  if (params.recipientUserId === params.performedByUserId) {
    return true;
  }

  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: params.recipientUserId,
      organization_id: params.organizationId,
      type: params.type,
      title: getNotificationTitle(params.type),
      message: params.message,
      reference_type: 'task',
      reference_id: params.taskId,
      is_read: false,
    });

    if (error) {
      console.error('[TaskNotification] Error creating notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TaskNotification] Error creating notification:', error);
    return false;
  }
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case 'task_assigned':
      return 'New Task Assigned';
    case 'task_reassigned':
      return 'Task Reassigned';
    case 'task_status_changed':
      return 'Task Status Updated';
    default:
      return 'Task Update';
  }
}
