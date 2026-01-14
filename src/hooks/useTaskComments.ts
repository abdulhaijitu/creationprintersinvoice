import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { logTaskActivity, createTaskNotification } from './useTaskActivityLogs';

export interface TaskComment {
  id: string;
  task_id: string;
  organization_id: string | null;
  comment_text: string;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
}

export function useTaskComments(taskId: string | null) {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const fetchComments = useCallback(async () => {
    if (!taskId || !organization?.id) {
      setComments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: true }); // Chronological order (oldest first)

      if (error) throw error;
      setComments((data || []) as TaskComment[]);
    } catch (error) {
      console.error('[TaskComments] Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, organization?.id]);

  // Fetch team members for @mentions
  const fetchTeamMembers = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, user_email, user_name')
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      setTeamMembers(
        (data || []).map((m: any) => ({
          id: m.user_id,
          email: m.user_email || '',
          name: m.user_name || m.user_email || 'Unknown',
        }))
      );
    } catch (error) {
      console.error('[TaskComments] Error fetching team members:', error);
    }
  }, [organization?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!taskId) return;

    fetchComments();
    fetchTeamMembers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchComments, fetchTeamMembers]);

  // Add a comment
  const addComment = useCallback(async (commentText: string): Promise<boolean> => {
    if (!taskId || !organization?.id || !user?.id) {
      toast.error('Unable to add comment');
      return false;
    }

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return false;
    }

    setSubmitting(true);
    try {
      // Parse mentions from comment text
      const mentionRegex = /@(\S+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(commentText)) !== null) {
        mentions.push(match[1]);
      }

      // Insert comment
      const { data: newComment, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          organization_id: organization.id,
          comment_text: commentText.trim(),
          created_by: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity for comment added
      if (newComment) {
        await logTaskActivity({
          taskId,
          organizationId: organization.id,
          actionType: 'comment_added',
          newValue: { comment_preview: commentText.slice(0, 100) },
          performedBy: user.id,
          performedByEmail: user.email,
        });
      }

      // Get task details for notifications
      const { data: task } = await supabase
        .from('tasks')
        .select('title, created_by, assigned_to')
        .eq('id', taskId)
        .single();

      // Notify task creator and assignee about new comment (if not the commenter)
      if (task && newComment) {
        const usersToNotify = new Set<string>();
        if (task.created_by && task.created_by !== user.id) usersToNotify.add(task.created_by);
        if (task.assigned_to && task.assigned_to !== user.id) usersToNotify.add(task.assigned_to);
        
        for (const recipientId of usersToNotify) {
          await createTaskNotification({
            organizationId: organization.id,
            taskId,
            taskTitle: task.title,
            type: 'task_comment',
            recipientUserId: recipientId,
            performedByUserId: user.id,
            message: `New comment on task "${task.title}": ${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}`,
          });
        }
      }

      // Process @mentions and create notifications
      if (mentions.length > 0 && newComment) {
        const mentionedUsers = teamMembers.filter(
          (m) => mentions.includes(m.email) || mentions.includes(m.name.replace(/\s+/g, ''))
        );

        for (const mentionedUser of mentionedUsers) {
          // Skip self-mentions
          if (mentionedUser.id === user.id) continue;

          // Log activity for mention
          await logTaskActivity({
            taskId,
            organizationId: organization.id,
            actionType: 'mentioned',
            newValue: { mentioned_user: mentionedUser.name, mentioned_user_id: mentionedUser.id },
            performedBy: user.id,
            performedByEmail: user.email,
          });

          // Insert mention record
          await supabase.from('task_comment_mentions').insert({
            comment_id: newComment.id,
            task_id: taskId,
            organization_id: organization.id,
            mentioned_user_id: mentionedUser.id,
            mentioned_by: user.id,
            notified: true,
          });

          // Create notification for mention
          await createTaskNotification({
            organizationId: organization.id,
            taskId,
            taskTitle: task?.title || 'Task',
            type: 'task_mentioned',
            recipientUserId: mentionedUser.id,
            performedByUserId: user.id,
            message: `${user.email} mentioned you in task "${task?.title || 'Unknown'}"`,
          });
        }
      }

      await fetchComments();
      return true;
    } catch (error) {
      console.error('[TaskComments] Error adding comment:', error);
      toast.error('Failed to add comment');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [taskId, organization?.id, user?.id, user?.email, user?.user_metadata, teamMembers, fetchComments]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)
        .eq('created_by', user?.id);

      if (error) throw error;
      await fetchComments();
      toast.success('Comment deleted');
      return true;
    } catch (error) {
      console.error('[TaskComments] Error deleting comment:', error);
      toast.error('Failed to delete comment');
      return false;
    }
  }, [user?.id, fetchComments]);

  return {
    comments,
    loading,
    submitting,
    teamMembers,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}
