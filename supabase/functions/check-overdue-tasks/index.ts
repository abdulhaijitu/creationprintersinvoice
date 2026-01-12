import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date in UTC
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().split('T')[0];

    console.log('[OverdueTasks] Checking for overdue tasks as of:', todayIso);

    // Find all overdue tasks that:
    // 1. Have a deadline before today
    // 2. Are not delivered/completed
    // 3. Haven't been notified today
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, deadline, created_by, assigned_to, organization_id, last_overdue_notification_at, status')
      .lt('deadline', todayIso)
      .not('status', 'eq', 'delivered')
      .or(`last_overdue_notification_at.is.null,last_overdue_notification_at.lt.${todayIso}`);

    if (fetchError) {
      console.error('[OverdueTasks] Error fetching tasks:', fetchError);
      throw fetchError;
    }

    console.log('[OverdueTasks] Found overdue tasks:', overdueTasks?.length || 0);

    const notificationsSent: string[] = [];
    const errors: string[] = [];

    for (const task of overdueTasks || []) {
      try {
        const usersToNotify = new Set<string>();
        
        // Notify creator
        if (task.created_by) usersToNotify.add(task.created_by);
        
        // Notify assignee
        if (task.assigned_to) usersToNotify.add(task.assigned_to);

        // Calculate days overdue
        const deadline = new Date(task.deadline);
        const daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));

        for (const userId of usersToNotify) {
          // Check if notification already exists for today
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('reference_id', task.id)
            .eq('type', 'task_overdue')
            .gte('created_at', todayIso)
            .single();

          if (existing) {
            console.log('[OverdueTasks] Notification already sent today for task:', task.id, 'user:', userId);
            continue;
          }

          // Create notification
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: userId,
            organization_id: task.organization_id,
            type: 'task_overdue',
            title: 'Overdue Task Alert',
            message: `Task "${task.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
            reference_type: 'task',
            reference_id: task.id,
            is_read: false,
          });

          if (notifError) {
            console.error('[OverdueTasks] Error creating notification:', notifError);
            errors.push(`Failed to notify ${userId} for task ${task.id}`);
          } else {
            notificationsSent.push(`${task.id}:${userId}`);
          }
        }

        // Update last notification timestamp
        await supabase
          .from('tasks')
          .update({ last_overdue_notification_at: new Date().toISOString() })
          .eq('id', task.id);

      } catch (taskError) {
        console.error('[OverdueTasks] Error processing task:', task.id, taskError);
        errors.push(`Error processing task ${task.id}`);
      }
    }

    const result = {
      success: true,
      tasksProcessed: overdueTasks?.length || 0,
      notificationsSent: notificationsSent.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[OverdueTasks] Complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OverdueTasks] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
