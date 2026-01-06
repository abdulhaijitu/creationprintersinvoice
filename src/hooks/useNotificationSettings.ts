import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useToast } from '@/hooks/use-toast';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';
export type NotificationType = 
  | 'trial_started' | 'trial_ending' | 'trial_expired'
  | 'invoice_generated' | 'payment_due_soon' | 'payment_due_today' | 'payment_overdue'
  | 'plan_activated' | 'plan_expired' | 'account_locked' | 'account_unlocked'
  | 'payment_success' | 'payment_failed';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface NotificationChannelSetting {
  id: string;
  channel: NotificationChannel;
  is_enabled: boolean;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  timezone: string;
}

export interface NotificationTypeSetting {
  notification_type: NotificationType;
  is_enabled: boolean;
}

export interface NotificationLog {
  id: string;
  organization_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  sent_at?: string;
  failed_reason?: string;
  retry_count: number;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body_template: string;
  is_active: boolean;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  trial_started: 'Trial Started',
  trial_ending: 'Trial Ending Soon',
  trial_expired: 'Trial Expired',
  invoice_generated: 'Invoice Generated',
  payment_due_soon: 'Payment Due Soon',
  payment_due_today: 'Payment Due Today',
  payment_overdue: 'Payment Overdue',
  plan_activated: 'Plan Activated',
  plan_expired: 'Plan Expired',
  account_locked: 'Account Locked',
  account_unlocked: 'Account Unlocked',
  payment_success: 'Payment Successful',
  payment_failed: 'Payment Failed',
};

export const NOTIFICATION_TYPE_CATEGORIES: Record<string, NotificationType[]> = {
  'Trial Reminders': ['trial_started', 'trial_ending', 'trial_expired'],
  'Billing Reminders': ['invoice_generated', 'payment_due_soon', 'payment_due_today', 'payment_overdue'],
  'Subscription Status': ['plan_activated', 'plan_expired', 'account_locked', 'account_unlocked'],
  'Payment Notifications': ['payment_success', 'payment_failed'],
};

export const useNotificationSettings = () => {
  const [channelSettings, setChannelSettings] = useState<NotificationChannelSetting[]>([]);
  const [typeSettings, setTypeSettings] = useState<NotificationTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { organization, isOrgOwner } = useOrganization();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!organization?.id) return;

    try {
      // Fetch channel settings
      const { data: channels, error: channelError } = await supabase
        .from('organization_notification_settings')
        .select('*')
        .eq('organization_id', organization.id);

      if (channelError) throw channelError;

      // Initialize with defaults if missing
      const defaultChannels: NotificationChannel[] = ['email', 'sms', 'whatsapp'];
      const existingChannels = new Set(channels?.map(c => c.channel) || []);
      
      const allChannelSettings: NotificationChannelSetting[] = defaultChannels.map(channel => {
        const existing = channels?.find(c => c.channel === channel);
        return existing ? {
          id: existing.id,
          channel: existing.channel as NotificationChannel,
          is_enabled: existing.is_enabled,
          contact_email: existing.contact_email,
          contact_phone: existing.contact_phone,
          whatsapp_number: existing.whatsapp_number,
          timezone: existing.timezone || 'Asia/Dhaka',
        } : {
          id: '',
          channel,
          is_enabled: channel === 'email',
          timezone: 'Asia/Dhaka',
        };
      });

      setChannelSettings(allChannelSettings);

      // Fetch type settings
      const { data: types, error: typeError } = await supabase
        .from('organization_notification_types')
        .select('*')
        .eq('organization_id', organization.id);

      if (typeError) throw typeError;

      // Initialize all types with defaults
      const allTypes = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[];
      const allTypeSettings: NotificationTypeSetting[] = allTypes.map(type => {
        const existing = types?.find(t => t.notification_type === type);
        return {
          notification_type: type,
          is_enabled: existing?.is_enabled ?? true,
        };
      });

      setTypeSettings(allTypeSettings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  const updateChannelSetting = async (
    channel: NotificationChannel,
    updates: Partial<NotificationChannelSetting>
  ) => {
    if (!organization?.id || !isOrgOwner) return;

    setSaving(true);
    try {
      const existing = channelSettings.find(c => c.channel === channel);
      
      if (existing?.id) {
        // Update existing
        const { error } = await supabase
          .from('organization_notification_settings')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('organization_notification_settings')
          .insert({
            organization_id: organization.id,
            channel,
            ...updates,
          });

        if (error) throw error;
      }

      // Refresh settings
      await fetchSettings();
      
      toast({
        title: 'Settings updated',
        description: `${channel.charAt(0).toUpperCase() + channel.slice(1)} settings saved`,
      });
    } catch (error) {
      console.error('Error updating channel setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateTypeSetting = async (type: NotificationType, isEnabled: boolean) => {
    if (!organization?.id || !isOrgOwner) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organization_notification_types')
        .upsert({
          organization_id: organization.id,
          notification_type: type,
          is_enabled: isEnabled,
        }, {
          onConflict: 'organization_id,notification_type',
        });

      if (error) throw error;

      setTypeSettings(prev =>
        prev.map(t =>
          t.notification_type === type ? { ...t, is_enabled: isEnabled } : t
        )
      );

      toast({
        title: 'Settings updated',
        description: `${NOTIFICATION_TYPE_LABELS[type]} notification ${isEnabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating type setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    channelSettings,
    typeSettings,
    loading,
    saving,
    updateChannelSetting,
    updateTypeSetting,
    refetch: fetchSettings,
  };
};

export const useNotificationLogs = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs((data || []) as NotificationLog[]);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    refetch: fetchLogs,
  };
};

export const useAdminNotificationLogs = () => {
  const [logs, setLogs] = useState<(NotificationLog & { organization?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
  });
  const { toast } = useToast();

  const fetchLogs = useCallback(async (filters?: {
    status?: NotificationStatus;
    channel?: NotificationChannel;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('notification_logs')
        .select('*, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedLogs = (data || []).map(log => ({
        ...log,
        organization: log.organizations,
      })) as (NotificationLog & { organization?: { name: string } })[];

      setLogs(mappedLogs);

      // Calculate stats
      const total = mappedLogs.length;
      const sent = mappedLogs.filter(l => l.status === 'sent').length;
      const failed = mappedLogs.filter(l => l.status === 'failed').length;
      const pending = mappedLogs.filter(l => l.status === 'pending').length;

      setStats({ total, sent, failed, pending });
    } catch (error) {
      console.error('Error fetching admin notification logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const retryNotification = async (logId: string) => {
    try {
      // Update to pending and reset retry count
      const { error } = await supabase
        .from('notification_logs')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      // Trigger the edge function to process
      await supabase.functions.invoke('process-notifications', {
        body: { action: 'retry_failed' },
      });

      toast({
        title: 'Retry initiated',
        description: 'Notification will be retried shortly',
      });

      await fetchLogs();
    } catch (error) {
      console.error('Error retrying notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to retry notification',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    stats,
    fetchLogs,
    retryNotification,
  };
};
