import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCallback, useEffect, useState } from 'react';

interface DeviceRegistration {
  id: string;
  organization_id: string;
  employee_id: string;
  device_fingerprint: string;
  device_name: string | null;
  browser_info: string | null;
  os_info: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

interface AttendanceSettings {
  device_restriction_enabled: boolean;
  auto_approve_first_device: boolean;
}

// Generate a simple device fingerprint
const generateDeviceFingerprint = (): string => {
  const { userAgent, language, platform } = navigator;
  const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const fingerprintData = `${userAgent}-${language}-${platform}-${screenInfo}-${timezone}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprintData.length; i++) {
    const char = fingerprintData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `device_${Math.abs(hash).toString(16)}`;
};

const getDeviceInfo = () => {
  const { userAgent, platform } = navigator;
  
  let browserInfo = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browserInfo = 'Chrome';
  else if (userAgent.includes('Firefox')) browserInfo = 'Firefox';
  else if (userAgent.includes('Safari')) browserInfo = 'Safari';
  else if (userAgent.includes('Edge')) browserInfo = 'Edge';
  
  let osInfo = platform || 'Unknown OS';
  if (userAgent.includes('Windows')) osInfo = 'Windows';
  else if (userAgent.includes('Mac')) osInfo = 'macOS';
  else if (userAgent.includes('Linux')) osInfo = 'Linux';
  else if (userAgent.includes('Android')) osInfo = 'Android';
  else if (userAgent.includes('iOS')) osInfo = 'iOS';
  
  return {
    browserInfo,
    osInfo,
    deviceName: `${browserInfo} on ${osInfo}`,
  };
};

export const useDeviceRestriction = (employeeId?: string) => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;
  
  const [deviceFingerprint] = useState(() => generateDeviceFingerprint());
  const [deviceInfo] = useState(() => getDeviceInfo());

  // Fetch device restriction settings
  const { data: settings } = useQuery({
    queryKey: ['attendance-settings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const { data, error } = await supabase
        .from('organization_attendance_settings')
        .select('device_restriction_enabled, auto_approve_first_device')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceSettings | null;
    },
    enabled: !!orgId,
  });

  // Fetch employee's device registrations
  const { data: deviceRegistrations = [] } = useQuery({
    queryKey: ['device-registrations', orgId, employeeId],
    queryFn: async () => {
      if (!orgId || !employeeId) return [];
      
      const { data, error } = await supabase
        .from('employee_device_registrations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', employeeId);

      if (error) throw error;
      return data as DeviceRegistration[];
    },
    enabled: !!orgId && !!employeeId,
  });

  // Fetch all device registrations for admin view
  const { data: allDeviceRegistrations = [], isLoading: isLoadingAllDevices } = useQuery({
    queryKey: ['all-device-registrations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('employee_device_registrations')
        .select(`
          *,
          employee:employees(id, full_name)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Check if current device is allowed
  const isDeviceAllowed = useCallback((): { allowed: boolean; reason?: string } => {
    if (!settings?.device_restriction_enabled) {
      return { allowed: true };
    }

    if (!employeeId) {
      return { allowed: false, reason: 'Employee not identified' };
    }

    const approvedDevices = deviceRegistrations.filter(d => d.is_approved);
    
    if (approvedDevices.length === 0 && settings.auto_approve_first_device) {
      return { allowed: true }; // First device will be auto-approved
    }

    const currentDeviceApproved = approvedDevices.some(
      d => d.device_fingerprint === deviceFingerprint
    );

    if (currentDeviceApproved) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'This device is not approved for attendance marking. Please contact your administrator.',
    };
  }, [settings, deviceRegistrations, deviceFingerprint, employeeId]);

  // Register current device
  const registerDevice = useMutation({
    mutationFn: async () => {
      if (!orgId || !employeeId || !user) throw new Error('Missing required data');

      const shouldAutoApprove = settings?.auto_approve_first_device && deviceRegistrations.length === 0;

      const { data, error } = await supabase
        .from('employee_device_registrations')
        .upsert({
          organization_id: orgId,
          employee_id: employeeId,
          device_fingerprint: deviceFingerprint,
          device_name: deviceInfo.deviceName,
          browser_info: deviceInfo.browserInfo,
          os_info: deviceInfo.osInfo,
          is_approved: shouldAutoApprove,
          approved_by: shouldAutoApprove ? user.id : null,
          approved_at: shouldAutoApprove ? new Date().toISOString() : null,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,employee_id,device_fingerprint',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-registrations'] });
    },
  });

  // Approve device (admin action)
  const approveDevice = useMutation({
    mutationFn: async (registrationId: string) => {
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('employee_device_registrations')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (error) throw error;

      // Log audit
      await logAuditAction('device_approved', registrationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-registrations'] });
      toast.success('Device approved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve device: ${error.message}`);
    },
  });

  // Revoke device approval (admin action)
  const revokeDevice = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from('employee_device_registrations')
        .update({
          is_approved: false,
          approved_by: null,
          approved_at: null,
        })
        .eq('id', registrationId);

      if (error) throw error;

      // Log audit
      await logAuditAction('device_revoked', registrationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-registrations'] });
      toast.success('Device access revoked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke device: ${error.message}`);
    },
  });

  // Delete device registration (admin action)
  const deleteDevice = useMutation({
    mutationFn: async (registrationId: string) => {
      const { error } = await supabase
        .from('employee_device_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      // Log audit
      await logAuditAction('device_deleted', registrationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['all-device-registrations'] });
      toast.success('Device registration deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete device: ${error.message}`);
    },
  });

  // Update settings
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<AttendanceSettings>) => {
      if (!orgId) throw new Error('Organization not found');

      const { error } = await supabase
        .from('organization_attendance_settings')
        .upsert({
          organization_id: orgId,
          ...newSettings,
        }, {
          onConflict: 'organization_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-settings'] });
      toast.success('Device restriction settings updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const logAuditAction = async (action: string, deviceId: string) => {
    if (!orgId || !user) return;

    try {
      await supabase.from('attendance_audit_logs').insert({
        organization_id: orgId,
        action,
        actor_id: user.id,
        actor_email: user.email,
        metadata: { device_id: deviceId },
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  // Update last used timestamp when marking attendance
  const updateLastUsed = useCallback(async () => {
    if (!orgId || !employeeId) return;

    await supabase
      .from('employee_device_registrations')
      .update({ last_used_at: new Date().toISOString() })
      .eq('organization_id', orgId)
      .eq('employee_id', employeeId)
      .eq('device_fingerprint', deviceFingerprint);
  }, [orgId, employeeId, deviceFingerprint]);

  return {
    settings,
    deviceRegistrations,
    allDeviceRegistrations,
    isLoadingAllDevices,
    deviceFingerprint,
    deviceInfo,
    isDeviceAllowed,
    registerDevice,
    approveDevice,
    revokeDevice,
    deleteDevice,
    updateSettings,
    updateLastUsed,
    isRestrictionEnabled: settings?.device_restriction_enabled ?? false,
  };
};
