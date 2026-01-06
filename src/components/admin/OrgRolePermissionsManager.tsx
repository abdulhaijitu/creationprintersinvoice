import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedAudit } from '@/hooks/useEnhancedAudit';

interface OrgRolePermission {
  id: string;
  role: string;
  permission_key: string;
  permission_category: string;
  permission_label: string;
  is_enabled: boolean;
  is_protected: boolean;
}

type OrgRole = 'owner' | 'manager' | 'accounts' | 'staff';

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accounts: 'Accounts',
  staff: 'Staff',
};

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'Full access to all features. Some permissions are protected.',
  manager: 'Limited admin access within the organization.',
  accounts: 'Financial and accounting operations.',
  staff: 'Basic operational access only.',
};

const CATEGORY_ORDER = [
  'Dashboard & Data',
  'Operations',
  'User Management',
  'Settings & Billing',
  'Advanced',
];

export const OrgRolePermissionsManager = () => {
  const [permissions, setPermissions] = useState<OrgRolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgRole>('owner');
  const { logConfigChange } = useEnhancedAudit();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('org_role_permissions')
        .select('*')
        .order('permission_category', { ascending: true })
        .order('permission_label', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const rolePermissions = useMemo(() => {
    return permissions.filter(p => p.role === selectedRole);
  }, [permissions, selectedRole]);

  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, OrgRolePermission[]> = {};
    
    rolePermissions.forEach(perm => {
      if (!grouped[perm.permission_category]) {
        grouped[perm.permission_category] = [];
      }
      grouped[perm.permission_category].push(perm);
    });

    // Sort by category order
    const sortedGrouped: Record<string, OrgRolePermission[]> = {};
    CATEGORY_ORDER.forEach(cat => {
      if (grouped[cat]) {
        sortedGrouped[cat] = grouped[cat];
      }
    });

    return sortedGrouped;
  }, [rolePermissions]);

  const handleTogglePermission = async (permission: OrgRolePermission) => {
    if (permission.is_protected && permission.is_enabled) {
      toast.error('This is a protected permission and cannot be disabled for this role');
      return;
    }

    const key = `${permission.role}-${permission.permission_key}`;
    setSaving(key);

    const newValue = !permission.is_enabled;

    try {
      const { error } = await supabase
        .from('org_role_permissions')
        .update({ is_enabled: newValue })
        .eq('id', permission.id);

      if (error) throw error;

      // Update local state
      setPermissions(prev =>
        prev.map(p =>
          p.id === permission.id ? { ...p, is_enabled: newValue } : p
        )
      );

      // Log audit event
      await logConfigChange(
        'Role Permission',
        `${permission.role}:${permission.permission_key}`,
        { permission_label: permission.permission_label, new_value: newValue },
        { is_enabled: permission.is_enabled },
        { is_enabled: newValue }
      );

      toast.success(
        `${permission.permission_label} ${newValue ? 'enabled' : 'disabled'} for ${ROLE_LABELS[permission.role as OrgRole]}`
      );
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const getEnabledCount = (role: OrgRole) => {
    return permissions.filter(p => p.role === role && p.is_enabled).length;
  };

  const getTotalCount = (role: OrgRole) => {
    return permissions.filter(p => p.role === role).length;
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
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Organization Role Permissions</CardTitle>
          </div>
          <CardDescription>
            Manage what each role can do in the Main App. Changes apply globally to all organizations immediately.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Role Tabs */}
      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgRole)}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
            <TabsTrigger
              key={role}
              value={role}
              className="flex flex-col items-center gap-1 py-3"
            >
              <span className="font-medium">{ROLE_LABELS[role]}</span>
              <span className="text-xs text-muted-foreground">
                {getEnabledCount(role)}/{getTotalCount(role)} enabled
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
          <TabsContent key={role} value={role} className="mt-6 space-y-4">
            {/* Role Description */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  {ROLE_DESCRIPTIONS[role]}
                </div>
              </CardContent>
            </Card>

            {/* Permission Categories */}
            {Object.entries(groupedPermissions).map(([category, perms]) => (
              <Card key={category}>
                <CardHeader className="py-4">
                  <CardTitle className="text-base font-medium">{category}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {perms.map((perm) => {
                      const isSaving = saving === `${perm.role}-${perm.permission_key}`;
                      const isDisabledToggle = perm.is_protected && perm.is_enabled;

                      return (
                        <div
                          key={perm.id}
                          className="flex items-center justify-between py-3 gap-4"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {perm.permission_label}
                                </span>
                                {perm.is_protected && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Lock className="h-3 w-3" />
                                    Protected
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {perm.permission_key}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : perm.is_enabled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : null}
                            <Switch
                              checked={perm.is_enabled}
                              onCheckedChange={() => handleTogglePermission(perm)}
                              disabled={isSaving || isDisabledToggle}
                              className={isDisabledToggle ? 'opacity-50 cursor-not-allowed' : ''}
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

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Permission & Plan Interaction</p>
              <p className="text-xs text-muted-foreground">
                Permissions control what users can do based on their role. However, features must also be allowed by the organization's subscription plan. 
                Both must pass for a user to access a feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgRolePermissionsManager;
