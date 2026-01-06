import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

export type AuditActionType = 
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'create'
  | 'update'
  | 'delete'
  | 'access'
  | 'suspend'
  | 'activate'
  | 'configure'
  | 'export'
  | 'import'
  | 'impersonate_start'
  | 'impersonate_end';

export type AuditSource = 'ui' | 'api' | 'system' | 'edge_function' | 'webhook' | 'admin_panel';

export interface AuditLogParams {
  action_type: AuditActionType;
  action_label: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  organization_id?: string;
  organization_name?: string;
  source?: AuditSource;
  metadata?: Record<string, unknown>;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
}

export const useEnhancedAudit = () => {
  const { user, role } = useAuth();

  const logAuditEvent = useCallback(async (params: AuditLogParams) => {
    try {
      const response = await supabase.functions.invoke('audit-log', {
        body: {
          actor_id: user?.id,
          actor_email: user?.email,
          actor_role: role,
          actor_type: 'user',
          ...params,
        },
      });

      if (response.error) {
        console.error('Failed to log audit event:', response.error);
        return { success: false, error: response.error };
      }

      return { success: true, id: response.data?.id };
    } catch (error) {
      console.error('Error logging audit event:', error);
      return { success: false, error };
    }
  }, [user, role]);

  // Convenience methods for common actions
  const logLogin = useCallback(() => 
    logAuditEvent({
      action_type: 'login',
      action_label: 'User logged in',
      entity_type: 'authentication',
      source: 'ui',
    }), [logAuditEvent]);

  const logLogout = useCallback(() => 
    logAuditEvent({
      action_type: 'logout',
      action_label: 'User logged out',
      entity_type: 'authentication',
      source: 'ui',
    }), [logAuditEvent]);

  const logOrganizationAction = useCallback((
    action: 'create' | 'update' | 'suspend' | 'activate' | 'delete',
    orgId: string,
    orgName: string,
    metadata?: Record<string, unknown>,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) => logAuditEvent({
    action_type: action,
    action_label: `Organization ${action}d: ${orgName}`,
    entity_type: 'organization',
    entity_id: orgId,
    entity_name: orgName,
    organization_id: orgId,
    organization_name: orgName,
    metadata,
    before_state: beforeState,
    after_state: afterState,
  }), [logAuditEvent]);

  const logSubscriptionAction = useCallback((
    action: 'create' | 'update' | 'configure',
    orgId: string,
    orgName: string,
    details: { plan?: string; status?: string; [key: string]: unknown },
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) => logAuditEvent({
    action_type: action,
    action_label: `Subscription ${action}d for ${orgName}`,
    entity_type: 'subscription',
    entity_id: orgId,
    entity_name: `${orgName} Subscription`,
    organization_id: orgId,
    organization_name: orgName,
    metadata: details,
    before_state: beforeState,
    after_state: afterState,
  }), [logAuditEvent]);

  const logBillingAction = useCallback((
    action: 'create' | 'update',
    invoiceId: string,
    orgId: string,
    orgName: string,
    details: Record<string, unknown>
  ) => logAuditEvent({
    action_type: action,
    action_label: `Billing invoice ${action}d for ${orgName}`,
    entity_type: 'billing',
    entity_id: invoiceId,
    entity_name: `Invoice ${invoiceId}`,
    organization_id: orgId,
    organization_name: orgName,
    metadata: details,
  }), [logAuditEvent]);

  const logRoleChange = useCallback((
    userId: string,
    userEmail: string,
    oldRole: string,
    newRole: string,
    orgId?: string,
    orgName?: string
  ) => logAuditEvent({
    action_type: 'update',
    action_label: `Role changed from ${oldRole} to ${newRole} for ${userEmail}`,
    entity_type: 'user_role',
    entity_id: userId,
    entity_name: userEmail,
    organization_id: orgId,
    organization_name: orgName,
    before_state: { role: oldRole },
    after_state: { role: newRole },
  }), [logAuditEvent]);

  const logWhiteLabelChange = useCallback((
    orgId: string,
    orgName: string,
    changes: Record<string, unknown>,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) => logAuditEvent({
    action_type: 'configure',
    action_label: `White-label settings updated for ${orgName}`,
    entity_type: 'whitelabel',
    entity_id: orgId,
    entity_name: `${orgName} White-Label`,
    organization_id: orgId,
    organization_name: orgName,
    metadata: changes,
    before_state: beforeState,
    after_state: afterState,
  }), [logAuditEvent]);

  const logConfigChange = useCallback((
    configType: string,
    configName: string,
    changes: Record<string, unknown>,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) => logAuditEvent({
    action_type: 'configure',
    action_label: `${configType} configuration updated: ${configName}`,
    entity_type: 'configuration',
    entity_name: configName,
    metadata: changes,
    before_state: beforeState,
    after_state: afterState,
  }), [logAuditEvent]);

  return {
    logAuditEvent,
    logLogin,
    logLogout,
    logOrganizationAction,
    logSubscriptionAction,
    logBillingAction,
    logRoleChange,
    logWhiteLabelChange,
    logConfigChange,
  };
};
