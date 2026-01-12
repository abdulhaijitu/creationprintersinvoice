import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SLA durations in hours based on priority
const SLA_DURATIONS: Record<string, number> = {
  low: 72,
  medium: 48,
  high: 24,
  urgent: 8,
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
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().split('T')[0];

    console.log('[OverdueTasks] Checking for overdue tasks and SLA breaches as of:', now.toISOString());

    // ===== PART 1: Overdue Tasks (based on deadline) =====
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, deadline, created_by, assigned_to, organization_id, last_overdue_notification_at, status')
      .lt('deadline', todayIso)
      .not('status', 'eq', 'delivered')
      .or(`last_overdue_notification_at.is.null,last_overdue_notification_at.lt.${todayIso}`);

    if (fetchError) {
      console.error('[OverdueTasks] Error fetching overdue tasks:', fetchError);
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
            notificationsSent.push(`overdue:${task.id}:${userId}`);
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

    // ===== PART 2: SLA Breach Alerts =====
    // Find tasks where SLA is at risk (80% elapsed) or breached
    const { data: slaTasks, error: slaError } = await supabase
      .from('tasks')
      .select('id, title, priority, sla_deadline, sla_warning_sent, sla_breach_sent, sla_breached, created_by, assigned_to, organization_id, status, created_at')
      .not('status', 'in', '("delivered","completed")')
      .not('sla_deadline', 'is', null);

    if (slaError) {
      console.error('[SLA] Error fetching SLA tasks:', slaError);
      throw slaError;
    }

    console.log('[SLA] Found tasks with SLA deadlines:', slaTasks?.length || 0);

    for (const task of slaTasks || []) {
      try {
        const slaDeadline = new Date(task.sla_deadline);
        const createdAt = new Date(task.created_at);
        const totalDuration = slaDeadline.getTime() - createdAt.getTime();
        const elapsed = now.getTime() - createdAt.getTime();
        const percentElapsed = (elapsed / totalDuration) * 100;
        const isBreached = now > slaDeadline;

        const usersToNotify = new Set<string>();
        if (task.created_by) usersToNotify.add(task.created_by);
        if (task.assigned_to) usersToNotify.add(task.assigned_to);

        // SLA Breach (100% elapsed)
        if (isBreached && !task.sla_breach_sent) {
          console.log('[SLA] Task breached SLA:', task.id, task.title);

          for (const userId of usersToNotify) {
            const { error: notifError } = await supabase.from('notifications').insert({
              user_id: userId,
              organization_id: task.organization_id,
              type: 'sla_breach',
              title: 'SLA Breached',
              message: `Task "${task.title}" has breached its SLA deadline`,
              reference_type: 'task',
              reference_id: task.id,
              is_read: false,
            });

            if (notifError) {
              errors.push(`Failed to notify ${userId} for SLA breach on task ${task.id}`);
            } else {
              notificationsSent.push(`sla_breach:${task.id}:${userId}`);
            }
          }

          // Mark as breached and notification sent
          await supabase
            .from('tasks')
            .update({ 
              sla_breached: true, 
              sla_breach_sent: true 
            })
            .eq('id', task.id);
        }
        // SLA Warning (80% elapsed but not yet breached)
        else if (percentElapsed >= 80 && !isBreached && !task.sla_warning_sent) {
          console.log('[SLA] Task at risk:', task.id, task.title, 'percent:', percentElapsed.toFixed(1));

          for (const userId of usersToNotify) {
            const { error: notifError } = await supabase.from('notifications').insert({
              user_id: userId,
              organization_id: task.organization_id,
              type: 'sla_warning',
              title: 'SLA At Risk',
              message: `Task "${task.title}" is approaching its SLA deadline`,
              reference_type: 'task',
              reference_id: task.id,
              is_read: false,
            });

            if (notifError) {
              errors.push(`Failed to notify ${userId} for SLA warning on task ${task.id}`);
            } else {
              notificationsSent.push(`sla_warning:${task.id}:${userId}`);
            }
          }

          // Mark warning sent
          await supabase
            .from('tasks')
            .update({ sla_warning_sent: true })
            .eq('id', task.id);
        }

      } catch (slaTaskError) {
        console.error('[SLA] Error processing task:', task.id, slaTaskError);
        errors.push(`Error processing SLA for task ${task.id}`);
      }
    }

    const result = {
      success: true,
      overdueTasksProcessed: overdueTasks?.length || 0,
      slaTasksProcessed: slaTasks?.length || 0,
      notificationsSent: notificationsSent.length,
      details: notificationsSent,
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
