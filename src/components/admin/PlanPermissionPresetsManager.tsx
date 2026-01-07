import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Lock, AlertCircle, CheckCircle2, Crown, Star, Zap, Gift } from 'lucide-react';
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

interface PlanPreset {
  id: string;
  plan_name: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';
type OrgRole = 'owner' | 'manager' | 'accounts' | 'staff';

const PLAN_CONFIG: Record<SubscriptionPlan, { label: string; icon: typeof Gift; color: string }> = {
  free: { label: 'Free Trial', icon: Gift, color: 'text-muted-foreground' },
  basic: { label: 'Basic', icon: Zap, color: 'text-blue-500' },
  pro: { label: 'Pro', icon: Star, color: 'text-amber-500' },
  enterprise: { label: 'Enterprise', icon: Crown, color: 'text-purple-500' },
};

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accounts: 'Accounts',
  staff: 'Staff',
};

const CATEGORY_ORDER = [
  'Core',
  'Sales & Billing',
  'Expenses',
  'HR & Workforce',
  'Reports',
  'Settings',
];

export const PlanPermissionPresetsManager = () => {
  const [globalPermissions, setGlobalPermissions] = useState<GlobalPermission[]>([]);
  const [planPresets, setPlanPresets] = useState<PlanPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('basic');
  const [selectedRole, setSelectedRole] = useState<OrgRole>('owner');
  const { logConfigChange } = useEnhancedAudit();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [globalRes, presetsRes] = await Promise.all([
        supabase
          .from('org_role_permissions')
          .select('*')
          .order('permission_category')
          .order('permission_label'),
        supabase.from('plan_permission_presets').select('*'),
      ]);

      if (globalRes.error) throw globalRes.error;
      if (presetsRes.error) throw presetsRes.error;

      setGlobalPermissions(globalRes.data || []);
      setPlanPresets(presetsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load plan permission presets');
    } finally {
      setLoading(false);
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

  const getPresetValue = useCallback(
    (plan: string, role: string, permissionKey: string): boolean => {
      const preset = planPresets.find(
        (p) => p.plan_name === plan && p.role === role && p.permission_key === permissionKey
      );
      // If no preset exists, fallback to global permission
      if (!preset) {
        const globalPerm = globalPermissions.find(
          (p) => p.role === role && p.permission_key === permissionKey
        );
        return globalPerm?.is_enabled ?? false;
      }
      return preset.is_enabled;
    },
    [planPresets, globalPermissions]
  );

  const handleTogglePreset = async (
    plan: string,
    role: string,
    permissionKey: string,
    currentValue: boolean,
    permissionLabel: string,
    isProtected: boolean
  ) => {
    // Prevent disabling protected permissions for owner
    if (isProtected && currentValue && role === 'owner') {
      toast.error('Protected permissions cannot be disabled for owners');
      return;
    }

    const key = `${plan}-${role}-${permissionKey}`;
    setSaving(key);

    const newValue = !currentValue;

    try {
      const existingPreset = planPresets.find(
        (p) => p.plan_name === plan && p.role === role && p.permission_key === permissionKey
      );

      if (existingPreset) {
        const { error } = await supabase
          .from('plan_permission_presets')
          .update({ is_enabled: newValue })
          .eq('id', existingPreset.id);

        if (error) throw error;

        setPlanPresets((prev) =>
          prev.map((p) => (p.id === existingPreset.id ? { ...p, is_enabled: newValue } : p))
        );
      } else {
        const { data, error } = await supabase
          .from('plan_permission_presets')
          .insert({
            plan_name: plan,
            role: role,
            permission_key: permissionKey,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;
        setPlanPresets((prev) => [...prev, data]);
      }

      await logConfigChange(
        'Plan Permission Preset',
        `${plan}:${role}:${permissionKey}`,
        { plan_name: plan, role, permission_label: permissionLabel },
        { is_enabled: currentValue },
        { is_enabled: newValue }
      );

      toast.success(
        `${permissionLabel} ${newValue ? 'enabled' : 'disabled'} for ${PLAN_CONFIG[plan as SubscriptionPlan].label} - ${ROLE_LABELS[role as OrgRole]}`
      );
    } catch (error) {
      console.error('Error updating preset:', error);
      toast.error('Failed to update plan preset');
    } finally {
      setSaving(null);
    }
  };

  const getEnabledCount = (plan: SubscriptionPlan, role: OrgRole) => {
    return rolePermissions.filter((p) => getPresetValue(plan, role, p.permission_key)).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Loading plan presets...</span>
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
            <CardTitle>Plan Permission Presets</CardTitle>
          </div>
          <CardDescription>
            Define default permissions for each subscription plan. These serve as the baseline for all
            organizations on that plan, but can be overridden at the organization level.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Plan Tabs */}
      <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as SubscriptionPlan)}>
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          {(Object.keys(PLAN_CONFIG) as SubscriptionPlan[]).map((plan) => {
            const config = PLAN_CONFIG[plan];
            const Icon = config.icon;
            return (
              <TabsTrigger key={plan} value={plan} className="flex flex-col items-center gap-1 py-3">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(PLAN_CONFIG) as SubscriptionPlan[]).map((plan) => (
          <TabsContent key={plan} value={plan} className="mt-6 space-y-4">
            {/* Role Sub-Tabs */}
            <Tabs
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as OrgRole)}
            >
              <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                {(Object.keys(ROLE_LABELS) as OrgRole[]).map((role) => (
                  <TabsTrigger
                    key={role}
                    value={role}
                    className="flex flex-col items-center gap-1 py-2"
                  >
                    <span className="font-medium text-sm">{ROLE_LABELS[role]}</span>
                    <span className="text-xs text-muted-foreground">
                      {getEnabledCount(plan, role)}/{rolePermissions.length}
                    </span>
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
                            const currentValue = getPresetValue(plan, perm.role, perm.permission_key);
                            const isSaving = saving === `${plan}-${perm.role}-${perm.permission_key}`;
                            const isProtectedOwner = perm.is_protected && perm.role === 'owner' && currentValue;

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
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : currentValue ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : null}
                                  <Switch
                                    checked={currentValue}
                                    onCheckedChange={() =>
                                      handleTogglePreset(
                                        plan,
                                        perm.role,
                                        perm.permission_key,
                                        currentValue,
                                        perm.permission_label,
                                        perm.is_protected
                                      )
                                    }
                                    disabled={isSaving || isProtectedOwner}
                                    className={isProtectedOwner ? 'opacity-50 cursor-not-allowed' : ''}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Permission Resolution Order</p>
              <p className="text-xs text-muted-foreground">
                1. <strong>Organization-specific overrides</strong> (highest priority) →
                2. <strong>Plan presets</strong> (this screen) →
                3. <strong>Global defaults</strong> (lowest priority)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanPermissionPresetsManager;
