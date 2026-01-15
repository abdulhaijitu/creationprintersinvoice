/**
 * Module Permissions Matrix Component
 * 
 * Premium UI/UX - Global Standard Design
 * Clean, professional Swiss design with modern aesthetics.
 * 
 * Uses modulePermissions.ts as SINGLE SOURCE OF TRUTH
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateModulePermissionCache } from '@/hooks/useModulePermissions';
import { 
  ALL_MODULE_PERMISSIONS, 
  PERMISSIONS_BY_CATEGORY, 
  CATEGORY_DISPLAY,
  type ModulePermission,
  type PermissionCategory 
} from '@/lib/permissions/modulePermissions';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { 
  Lock,
  Loader2,
  Shield,
  ShieldCheck,
  RefreshCw,
  Eye,
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  FileText,
  Calculator,
  Truck,
  Users,
  Wallet,
  UserCog,
  Clock,
  BanknoteIcon,
  PalmtreeIcon,
  BarChart3,
  ClipboardList,
  Settings,
  Crown,
  Briefcase,
  Building2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrgModulePermission {
  id: string;
  organization_id: string;
  role: string;
  permission_key: string;
  is_enabled: boolean;
}

// Staff roles that can have permissions configured (excluding owner)
const STAFF_ROLES: OrgRole[] = ['manager', 'accounts', 'sales_staff', 'designer', 'employee'];

// Permission actions
type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

const ACTION_CONFIG: Record<PermissionAction, { 
  label: string; 
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>; 
  colorClass: string;
}> = {
  view: { 
    label: 'View', 
    shortLabel: 'V',
    icon: Eye, 
    colorClass: 'text-blue-500',
  },
  create: { 
    label: 'Create', 
    shortLabel: 'C',
    icon: Plus, 
    colorClass: 'text-emerald-500',
  },
  edit: { 
    label: 'Edit', 
    shortLabel: 'E',
    icon: Pencil, 
    colorClass: 'text-amber-500',
  },
  delete: { 
    label: 'Delete', 
    shortLabel: 'D',
    icon: Trash2, 
    colorClass: 'text-red-500',
  },
};

// Role styling
const ROLE_CONFIG: Record<OrgRole, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  owner: { color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Crown },
  manager: { color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800', icon: Shield },
  accounts: { color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Calculator },
  sales_staff: { color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800', icon: Users },
  designer: { color: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800', icon: Briefcase },
  employee: { color: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700', icon: Briefcase },
};

// Module icons mapping
const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  invoices: FileText,
  payments: Wallet,
  quotations: FileText,
  price_calculations: Calculator,
  delivery_challans: Truck,
  customers: Users,
  vendors: Building2,
  expenses: Wallet,
  employees: UserCog,
  attendance: Clock,
  salary: BanknoteIcon,
  leave: PalmtreeIcon,
  performance: BarChart3,
  tasks: ClipboardList,
  reports: BarChart3,
  team_members: Users,
  settings: Settings,
};

const CATEGORY_ICONS: Record<PermissionCategory, React.ComponentType<{ className?: string }>> = {
  main: LayoutDashboard,
  business: Briefcase,
  hr_ops: Users,
  system: Settings,
};

const CATEGORY_ORDER: PermissionCategory[] = ['main', 'business', 'hr_ops', 'system'];

// Build permission key for storage: module.action
const buildPermissionKey = (moduleKey: string, action: PermissionAction): string => {
  // Extract module name from key (e.g., "main.dashboard" -> "dashboard")
  const parts = moduleKey.split('.');
  const moduleName = parts.length > 1 ? parts[1] : moduleKey;
  return `${moduleName}.${action}`;
};

interface ModulePermissionsMatrixProps {
  className?: string;
  onPermissionsChanged?: () => void;
}

export function ModulePermissionsMatrix({ className, onPermissionsChanged }: ModulePermissionsMatrixProps) {
  const { organization, isOrgOwner } = useOrganization();
  const { isSuperAdmin } = useAuth();
  
  const [orgPermissions, setOrgPermissions] = useState<OrgModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgRole>('manager');
  const isMountedRef = useRef(true);
  
  // Permission state: Map<"module.action.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(new Map());

  const buildPermissionState = useCallback((orgPerms: OrgModulePermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    for (const module of ALL_MODULE_PERMISSIONS) {
      for (const action of PERMISSION_ACTIONS) {
        for (const role of STAFF_ROLES) {
          const permKey = buildPermissionKey(module.key, action);
          const stateKey = `${permKey}.${role}`;
          state.set(stateKey, false);
        }
      }
    }
    
    for (const perm of orgPerms) {
      const stateKey = `${perm.permission_key}.${perm.role}`;
      state.set(stateKey, perm.is_enabled);
    }
    
    return state;
  }, []);

  const fetchPermissions = useCallback(async (showToast = false) => {
    if (!organization) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_specific_permissions')
        .select('*')
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      const perms = data || [];
      const state = buildPermissionState(perms);
      
      if (isMountedRef.current) {
        setOrgPermissions(perms);
        setPermissionState(state);
      }
      if (showToast) {
        toast.success('Permissions refreshed');
      }
    } catch (error) {
      console.error('[ModulePermissionsMatrix] Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [organization, buildPermissionState]);

  useEffect(() => {
    isMountedRef.current = true;
    if (organization) {
      fetchPermissions();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [organization?.id]);

  const isChecked = useCallback((moduleKey: string, action: PermissionAction, role: OrgRole): boolean => {
    if (role === 'owner') return true;
    const permKey = buildPermissionKey(moduleKey, action);
    return permissionState.get(`${permKey}.${role}`) ?? false;
  }, [permissionState]);

  const canToggle = useCallback((role: OrgRole): boolean => {
    if (!isOrgOwner && !isSuperAdmin) return false;
    if (role === 'owner') return false;
    return true;
  }, [isOrgOwner, isSuperAdmin]);

  const handleToggle = async (moduleKey: string, action: PermissionAction, role: OrgRole) => {
    if (!organization || !canToggle(role)) return;

    const permKey = buildPermissionKey(moduleKey, action);
    const stateKey = `${permKey}.${role}`;
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    const newPermissionState = new Map(permissionState);
    newPermissionState.set(stateKey, newValue);
    setPermissionState(newPermissionState);
    
    setSavingKey(stateKey);

    try {
      const existing = orgPermissions.find(
        p => p.permission_key === permKey && p.role === role
      );

      let newOrgPermissions: OrgModulePermission[];

      if (existing) {
        const { error } = await supabase
          .from('org_specific_permissions')
          .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;

        newOrgPermissions = orgPermissions.map(p => 
          p.id === existing.id ? { ...p, is_enabled: newValue } : p
        );
      } else {
        const { data, error } = await supabase
          .from('org_specific_permissions')
          .insert({
            organization_id: organization.id,
            role,
            permission_key: permKey,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;
        newOrgPermissions = [...orgPermissions, data];
      }

      setOrgPermissions(newOrgPermissions);
      invalidateModulePermissionCache();
      onPermissionsChanged?.();
      
    } catch (error) {
      console.error('[ModulePermissionsMatrix] Error updating permission:', error);
      const revertedState = new Map(permissionState);
      revertedState.set(stateKey, currentValue);
      setPermissionState(revertedState);
      toast.error('Failed to save permission');
    } finally {
      setSavingKey(null);
    }
  };

  // Enable/disable all actions for a module
  const handleToggleAllActions = async (moduleKey: string, role: OrgRole, enable: boolean) => {
    if (!organization || !canToggle(role)) return;
    
    for (const action of PERMISSION_ACTIONS) {
      const permKey = buildPermissionKey(moduleKey, action);
      const stateKey = `${permKey}.${role}`;
      const currentValue = permissionState.get(stateKey) ?? false;
      
      if (currentValue !== enable) {
        await handleToggle(moduleKey, action, role);
      }
    }
  };

  // Count enabled permissions for a module
  const getModulePermissionCount = (moduleKey: string, role: OrgRole): number => {
    return PERMISSION_ACTIONS.filter(action => isChecked(moduleKey, action, role)).length;
  };

  // Access control
  if (!isOrgOwner && !isSuperAdmin) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Only organization owners can manage staff permissions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Use pre-computed PERMISSIONS_BY_CATEGORY from single source of truth
  // This contains: main (5), business (3), hr_ops (6), system (3) = 17 total modules
  const RoleIcon = ROLE_CONFIG[selectedRole].icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn('border-border/50 shadow-sm overflow-hidden', className)}>
        {/* Header */}
        <CardHeader className="pb-4 border-b bg-gradient-to-r from-primary/5 via-background to-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shadow-sm">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Staff Permissions</CardTitle>
                <CardDescription className="mt-0.5">
                  Configure module access for each role
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPermissions(true)}
              disabled={loading}
              className="gap-2 h-9 shrink-0"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Role Selector Tabs */}
          <div className="border-b bg-muted/30 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-muted-foreground">Select Role:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map((role) => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const isActive = selectedRole === role;
                
                // Count total enabled permissions for this role
                const enabledCount = ALL_MODULE_PERMISSIONS.reduce((acc, m) => 
                  acc + getModulePermissionCount(m.key, role), 0
                );
                const totalCount = ALL_MODULE_PERMISSIONS.length * PERMISSION_ACTIONS.length;
                
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200",
                      "hover:shadow-md active:scale-[0.98]",
                      isActive 
                        ? cn(config.color, "border-current shadow-sm") 
                        : "bg-card border-transparent hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? '' : 'text-muted-foreground')} />
                    <span className={cn("font-medium text-sm", !isActive && "text-muted-foreground")}>
                      {ORG_ROLE_DISPLAY[role]}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5",
                        isActive ? "bg-background/50" : "bg-muted"
                      )}
                    >
                      {enabledCount}/{totalCount}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions Legend */}
          <div className="px-4 py-3 border-b bg-background flex flex-wrap items-center gap-4 text-xs">
            <span className="font-medium text-muted-foreground">Actions:</span>
            {PERMISSION_ACTIONS.map(action => {
              const config = ACTION_CONFIG[action];
              const Icon = config.icon;
              return (
                <div key={action} className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5", config.colorClass)} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              );
            })}
          </div>

          {/* Permissions Grid */}
          <div>
            <div className="divide-y">
              {CATEGORY_ORDER.map((category) => {
                const CategoryIcon = CATEGORY_ICONS[category];
                const categoryLabel = CATEGORY_DISPLAY[category].label;
                const modules = PERMISSIONS_BY_CATEGORY[category];
                
                if (modules.length === 0) return null;
                
                return (
                  <div key={category} className="animate-fade-in">
                    {/* Category Header */}
                    <div className="px-4 py-3 bg-muted/40 border-b">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm uppercase tracking-wider text-foreground">
                          {categoryLabel}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {modules.length} modules
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Module Rows */}
                    <div className="divide-y divide-border/50">
                      {modules.map((module) => {
                        const ModuleIcon = MODULE_ICONS[module.module] || Briefcase;
                        const enabledCount = getModulePermissionCount(module.key, selectedRole);
                        const allEnabled = enabledCount === PERMISSION_ACTIONS.length;
                        const someEnabled = enabledCount > 0;
                        
                        return (
                          <div 
                            key={module.key}
                            className="px-4 py-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              {/* Module Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <ModuleIcon className="h-4.5 w-4.5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm">{module.label}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {module.description}
                                    </div>
                                  </div>
                                  
                                  {/* Quick Toggle All */}
                                  <div className="ml-auto flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground hidden sm:block">
                                      {enabledCount}/{PERMISSION_ACTIONS.length} enabled
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleToggleAllActions(module.key, selectedRole, !allEnabled)}
                                          className={cn(
                                            "h-7 px-2.5 rounded-md text-xs font-medium transition-all",
                                            "border flex items-center gap-1.5",
                                            allEnabled 
                                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/20" 
                                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                                          )}
                                        >
                                          {allEnabled ? (
                                            <>
                                              <CheckCircle2 className="h-3.5 w-3.5" />
                                              <span className="hidden sm:inline">All On</span>
                                            </>
                                          ) : (
                                            <>
                                              <XCircle className="h-3.5 w-3.5" />
                                              <span className="hidden sm:inline">Enable All</span>
                                            </>
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {allEnabled ? 'Disable all permissions' : 'Enable all permissions'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                                
                                {/* Permission Actions Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {PERMISSION_ACTIONS.map(action => {
                                    const actionConfig = ACTION_CONFIG[action];
                                    const ActionIcon = actionConfig.icon;
                                    const permKey = buildPermissionKey(module.key, action);
                                    const stateKey = `${permKey}.${selectedRole}`;
                                    const checked = isChecked(module.key, action, selectedRole);
                                    const isSaving = savingKey === stateKey;
                                    
                                    return (
                                      <button
                                        key={action}
                                        onClick={() => handleToggle(module.key, action, selectedRole)}
                                        disabled={isSaving}
                                        className={cn(
                                          "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all duration-200",
                                          "hover:shadow-sm active:scale-[0.98]",
                                          checked 
                                            ? "bg-primary/10 border-primary/30 text-primary" 
                                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                                        )}
                                      >
                                        {isSaving ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <ActionIcon className={cn("h-4 w-4", checked && actionConfig.colorClass)} />
                                        )}
                                        <span className="text-sm font-medium">{actionConfig.label}</span>
                                        <div className="ml-auto">
                                          {checked ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                          ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>Owner permissions are always enabled</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Changes saved automatically</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
