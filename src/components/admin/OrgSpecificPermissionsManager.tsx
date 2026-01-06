import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Shield, Lock, AlertCircle, CheckCircle2, Globe, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedAudit } from '@/hooks/useEnhancedAudit';

interface GlobalPermission {
  id: string;
  role: string;
  permission_key: string;
  permission_category: string;
  permission_label: string;
  is_enabled: boolean;
  is_protected: boolean;
}

interface OrgSpecificPermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

interface OrgPermissionSettings {
  id: string;
  organization_id: string;
  use_global_permissions: boolean;
}

type OrgRole = 'owner' | 'manager' | 'accounts' | 'staff';

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accounts: 'Accounts',
  staff: 'Staff',
};

const CATEGORY_ORDER = [
  'Dashboard & Data',
  'Operations',
  'User Management',
  'Settings & Billing',
  'Advanced',
];

interface OrgSpecificPermissionsManagerProps {
  organizationId: string;
  organizationName: string;
}

export const OrgSpecificPermissionsManager = ({
  organizationId,
  organizationName,
}: OrgSpecificPermissionsManagerProps) => {
  const [globalPermissions, setGlobalPermissions] = useState<GlobalPermission[]>([]);
  const [orgPermissions, setOrgPermissions] = useState<OrgSpecificPermission[]>([]);
  const [settings, setSettings] = useState<OrgPermissionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgRole>('owner');
  const { logConfigChange } = useEnhancedAudit();

  const useGlobalPermissions = settings?.use_global_permissions ?? true;

  useEffect(() => {
    fetchAllData();
  }, [organizationId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch global permissions
      const { data: globalData, error: globalError } = await supabase
        .from('org_role_permissions')
        .select('*')
        .order('permission_category', { ascending: true })
        .order('permission_label', { ascending: true });

      if (globalError) throw globalError;
      setGlobalPermissions(globalData || []);

      // Fetch org-specific permissions
      const { data: orgData, error: orgError } = await supabase
        .from('org_specific_permissions')
        .select('*')
        .eq('organization_id', organizationId);

      if (orgError) throw orgError;
      setOrgPermissions(orgData || []);

      // Fetch org permission settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('org_permission_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (settingsError) throw settingsError;
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobal = async (useGlobal: boolean) => {
    setSaving('toggle');
    try {
      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('org_permission_settings')
          .update({ use_global_permissions: useGlobal })
          .eq('id', settings.id);

        if (error) throw error;
        setSettings({ ...settings, use_global_permissions: useGlobal });
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('org_permission_settings')
          .insert({
            organization_id: organizationId,
            use_global_permissions: useGlobal,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      await logConfigChange(
        'Organization Permission Mode',
        organizationId,
        { organization_name: organizationName },
        { use_global_permissions: !useGlobal },
        { use_global_permissions: useGlobal }
      );

      toast.success(
        useGlobal
          ? 'Now using global role permissions'
          : 'Now using custom permissions for this organization'
      );
    } catch (error) {
      console.error('Error toggling permission mode:', error);
      toast.error('Failed to update permission mode');
    } finally {
      setSaving(null);
    }
  };

  const getEffectivePermission = useCallback(
    (role: string, permissionKey: string): boolean => {
      // If using global, return global permission
      const globalPerm = globalPermissions.find(
        (p) => p.role === role && p.permission_key === permissionKey
      );

      if (useGlobalPermissions) {
        return globalPerm?.is_enabled ?? false;
      }

      // Check org-specific override first
      const orgPerm = orgPermissions.find(
        (p) => p.role === role && p.permission_key === permissionKey
      );

      // If org override exists, use it
      if (orgPerm) {
        return orgPerm.is_enabled;
      }

      // Fallback to global
      return globalPerm?.is_enabled ?? false;
    },
    [globalPermissions, orgPermissions, useGlobalPermissions]
  );

  const hasOrgOverride = useCallback(
    (role: string, permissionKey: string): boolean => {
      return orgPermissions.some(
        (p) => p.role === role && p.permission_key === permissionKey
      );
    },
    [orgPermissions]
  );

  const handleTogglePermission = async (
    globalPerm: GlobalPermission,
    currentValue: boolean
  ) => {
    if (useGlobalPermissions) {
      toast.error('Switch to custom permissions to edit');
      return;
    }

    // Prevent disabling protected permissions for owner
    if (globalPerm.is_protected && currentValue && globalPerm.role === 'owner') {
      toast.error('This is a protected permission and cannot be disabled for owners');
      return;
    }

    const key = `${globalPerm.role}-${globalPerm.permission_key}`;
    setSaving(key);

    const newValue = !currentValue;

    try {
      const existingOverride = orgPermissions.find(
        (p) =>
          p.role === globalPerm.role && p.permission_key === globalPerm.permission_key
      );

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('org_specific_permissions')
          .update({ is_enabled: newValue })
          .eq('id', existingOverride.id);

        if (error) throw error;

        setOrgPermissions((prev) =>
          prev.map((p) =>
            p.id === existingOverride.id ? { ...p, is_enabled: newValue } : p
          )
        );
      } else {
        // Create new override
        const { data, error } = await supabase
          .from('org_specific_permissions')
          .insert({
            organization_id: organizationId,
            role: globalPerm.role,
            permission_key: globalPerm.permission_key,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;
        setOrgPermissions((prev) => [...prev, data]);
      }

      await logConfigChange(
        'Organization Role Permission',
        `${organizationId}:${globalPerm.role}:${globalPerm.permission_key}`,
        {
          organization_name: organizationName,
          permission_label: globalPerm.permission_label,
        },
        { is_enabled: currentValue },
        { is_enabled: newValue }
      );

      toast.success(
        `${globalPerm.permission_label} ${newValue ? 'enabled' : 'disabled'} for ${ROLE_LABELS[globalPerm.role as OrgRole]}`
      );
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const rolePermissions = useMemo(() => {
    return globalPermissions.filter((p) => p.role === selectedRole);
  }, [globalPermissions, selectedRole]);

  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, GlobalPermission[]> = {};

    rolePermissions.forEach((perm) => {
      if (!grouped[perm.permission_category]) {
        grouped[perm.permission_category] = [];
      }
      grouped[perm.permission_category].push(perm);
    });

    const sortedGrouped: Record<string, GlobalPermission[]> = {};
    CATEGORY_ORDER.forEach((cat) => {
      if (grouped[cat]) {
        sortedGrouped[cat] = grouped[cat];
      }
    });

    return sortedGrouped;
  }, [rolePermissions]);

  const getOverrideCount = (role: OrgRole) => {
    return orgPermissions.filter((p) => p.role === role).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading permissions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Global Toggle */}
      <Card className={useGlobalPermissions ? 'border-primary/50' : 'border-amber-500/50'}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {useGlobalPermissions ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Building2 className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <Label className="text-sm font-medium">
                  Use Global Role Permissions
                </Label>
                <p className="text-xs text-muted-foreground">
                  {useGlobalPermissions
                    ? 'Using default permissions from global settings'
                    : 'Custom permissions are applied for this organization'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving === 'toggle' && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={useGlobalPermissions}
                onCheckedChange={handleToggleGlobal}
                disabled={saving === 'toggle'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!useGlobalPermissions && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Custom permissions active.</strong> Changes here override global
                settings for this organization only.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Tabs */}
      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgRole)}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
            <TabsTrigger
              key={role}
              value={role}
              className="flex flex-col items-center gap-1 py-2"
            >
              <span className="font-medium text-xs">{ROLE_LABELS[role]}</span>
              {!useGlobalPermissions && getOverrideCount(role) > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  {getOverrideCount(role)} custom
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
          <TabsContent key={role} value={role} className="mt-4 space-y-3">
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <Card key={category}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">{category}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {perms.map((perm) => {
                      const effectiveValue = getEffectivePermission(
                        perm.role,
                        perm.permission_key
                      );
                      const hasOverride = hasOrgOverride(perm.role, perm.permission_key);
                      const isSaving =
                        saving === `${perm.role}-${perm.permission_key}`;
                      const isProtectedOwner =
                        perm.is_protected && perm.role === 'owner' && effectiveValue;

                      return (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between py-2.5 gap-3"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm truncate">
                                  {perm.permission_label}
                                </span>
                                {perm.is_protected && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-0.5 px-1 py-0 shrink-0"
                                  >
                                    <Lock className="h-2.5 w-2.5" />
                                    Protected
                                  </Badge>
                                )}
                                {!useGlobalPermissions && hasOverride && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 shrink-0"
                                  >
                                    Custom
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : effectiveValue ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : null}
                            <Switch
                              checked={effectiveValue}
                              onCheckedChange={() =>
                                handleTogglePermission(perm, effectiveValue)
                              }
                              disabled={
                                isSaving || useGlobalPermissions || isProtectedOwner
                              }
                              className={
                                useGlobalPermissions || isProtectedOwner
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default OrgSpecificPermissionsManager;
