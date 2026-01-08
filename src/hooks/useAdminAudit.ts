import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 
  | 'view_organization'
  | 'suspend_organization'
  | 'activate_organization'
  | 'extend_trial'
  | 'change_plan'
  | 'change_status'
  | 'view_users'
  | 'disable_user'
  | 'reset_password'
  | 'impersonate_user'
  | 'update_user_organizations'
  | 'reassign_owner';

export const useAdminAudit = () => {
  const { user } = useAuth();

  const logAction = async (
    action: AuditAction,
    entityType: string,
    entityId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;

    try {
      await supabase.from('admin_audit_logs').insert([{
        admin_user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
      }]);
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};
