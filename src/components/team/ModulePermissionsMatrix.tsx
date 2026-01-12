/**
 * Module Permissions Matrix Component
 * 
 * Premium UI/UX design for managing module-based permissions.
 * Supports View / Create / Edit / Delete actions per module.
 * 
 * DESIGN PRINCIPLES:
 * - Clean, professional Swiss design
 * - Clear visual hierarchy
 * - Smooth micro-interactions
 * - Accessible and responsive
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateModulePermissionCache } from '@/hooks/useModulePermissions';
import { 
  PERMISSIONS_BY_CATEGORY,
  CATEGORY_DISPLAY,
  type ModulePermission,
  type PermissionCategory,
} from '@/lib/permissions/modulePermissions';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  ChevronRight,
  Users,
  Layers,
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
  bgColor: string;
  iconColor: string;
  hoverColor: string;
}> = {
  view: { 
    label: 'View', 
    shortLabel: 'V',
    icon: Eye, 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    hoverColor: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
  },
  create: { 
    label: 'Create', 
    shortLabel: 'C',
    icon: Plus, 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hoverColor: 'group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50'
  },
  edit: { 
    label: 'Edit', 
    shortLabel: 'E',
    icon: Pencil, 
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hoverColor: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50'
  },
  delete: { 
    label: 'Delete', 
    shortLabel: 'D',
    icon: Trash2, 
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400',
    hoverColor: 'group-hover:bg-red-100 dark:group-hover:bg-red-900/50'
  },
};

// Role colors
const ROLE_COLORS: Record<OrgRole, string> = {
  owner: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  manager: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  accounts: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  sales_staff: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  designer: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
  employee: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
};

// Ordered categories for display
const CATEGORY_ORDER: PermissionCategory[] = ['main', 'business', 'hr_ops', 'system'];

const CATEGORY_ICONS: Record<PermissionCategory, React.ComponentType<{ className?: string }>> = {
  main: Layers,
  business: Users,
  hr_ops: Users,
  system: Shield,
};

// Build permission key: module.action (e.g., "customers.view")
const buildPermissionKey = (moduleKey: string, action: PermissionAction): string => {
  const moduleName = moduleKey.split('.')[1] || moduleKey;
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
  const isMountedRef = useRef(true);
  
  // Permission state: Map<"module.action.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(new Map());

  const buildPermissionState = useCallback((orgPerms: OrgModulePermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    for (const category of CATEGORY_ORDER) {
      for (const perm of PERMISSIONS_BY_CATEGORY[category]) {
        for (const action of PERMISSION_ACTIONS) {
          for (const role of STAFF_ROLES) {
            const permKey = buildPermissionKey(perm.key, action);
            const stateKey = `${permKey}.${role}`;
            state.set(stateKey, false);
          }
        }
      }
    }
    
    for (const perm of orgPerms) {
      for (const role of STAFF_ROLES) {
        if (perm.role === role) {
          const stateKey = `${perm.permission_key}.${role}`;
          state.set(stateKey, perm.is_enabled);
        }
      }
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

  const isChecked = useCallback((permissionKey: string, role: OrgRole): boolean => {
    if (role === 'owner') return true;
    return permissionState.get(`${permissionKey}.${role}`) ?? false;
  }, [permissionState]);

  const canToggle = useCallback((role: OrgRole): boolean => {
    if (!isOrgOwner && !isSuperAdmin) return false;
    if (role === 'owner') return false;
    return true;
  }, [isOrgOwner, isSuperAdmin]);

  const handleToggle = async (permissionKey: string, role: OrgRole) => {
    if (!organization || !canToggle(role)) return;

    const stateKey = `${permissionKey}.${role}`;
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    const newPermissionState = new Map(permissionState);
    newPermissionState.set(stateKey, newValue);
    setPermissionState(newPermissionState);
    
    setSavingKey(stateKey);

    try {
      const existing = orgPermissions.find(
        p => p.permission_key === permissionKey && p.role === role
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
            permission_key: permissionKey,
            is_enabled: newValue,
          })
          .select()
          .single();

        if (error) throw error;
        newOrgPermissions = [...orgPermissions, data];
      }

      setOrgPermissions(newOrgPermissions);
      invalidateModulePermissionCache(organization.id);
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

  // Access control
  if (!isOrgOwner && !isSuperAdmin) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
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
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn('border-border/50 shadow-sm overflow-hidden', className)}>
        {/* Header */}
        <CardHeader className="pb-4 bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Module Permissions</CardTitle>
                <CardDescription className="mt-0.5">
                  Configure access for each role
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPermissions(true)}
              disabled={loading}
              className="gap-2 h-9"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Action Legend */}
          <div className="px-4 py-3 border-y bg-muted/30 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground mr-2">Actions:</span>
            {PERMISSION_ACTIONS.map(action => {
              const config = ACTION_CONFIG[action];
              const Icon = config.icon;
              return (
                <div 
                  key={action} 
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                    config.bgColor
                  )}
                >
                  <Icon className={cn("h-3 w-3", config.iconColor)} />
                  <span className={config.iconColor}>{config.label}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Owner = Locked</span>
            </div>
          </div>

          {/* Permissions Grid */}
          <ScrollArea className="w-full">
            <div className="min-w-[700px]">
              {/* Role Header */}
              <div className="grid grid-cols-[240px_repeat(5,1fr)] border-b bg-muted/20 sticky top-0 z-10">
                <div className="px-4 py-3 font-medium text-sm text-muted-foreground">
                  Module / Action
                </div>
                {STAFF_ROLES.map((role) => (
                  <div key={role} className="px-2 py-3 text-center">
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] font-medium px-2 py-0.5", ROLE_COLORS[role])}
                    >
                      {ORG_ROLE_DISPLAY[role]}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Category Groups */}
              {CATEGORY_ORDER.map((category) => {
                const CategoryIcon = CATEGORY_ICONS[category];
                return (
                  <div key={category} className="animate-fade-in">
                    {/* Category Header */}
                    <div className="grid grid-cols-[240px_repeat(5,1fr)] bg-muted/40 border-b">
                      <div className="px-4 py-2.5 flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                          {CATEGORY_DISPLAY[category].label}
                        </span>
                      </div>
                      {STAFF_ROLES.map((role) => (
                        <div key={role} className="px-2 py-2.5" />
                      ))}
                    </div>
                    
                    {/* Module Rows */}
                    {PERMISSIONS_BY_CATEGORY[category].map((perm, permIdx) => (
                      <div 
                        key={perm.key}
                        className={cn(
                          "grid grid-cols-[240px_repeat(5,1fr)] border-b transition-colors hover:bg-muted/20",
                          permIdx % 2 === 0 ? "bg-background" : "bg-muted/5"
                        )}
                      >
                        {/* Module Info */}
                        <div className="px-4 py-3 border-r border-border/50">
                          <div className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{perm.label}</div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {perm.description}
                              </div>
                              {/* Action Pills */}
                              <div className="flex items-center gap-1 mt-2">
                                {PERMISSION_ACTIONS.map(action => {
                                  const config = ACTION_CONFIG[action];
                                  const Icon = config.icon;
                                  return (
                                    <Tooltip key={action}>
                                      <TooltipTrigger asChild>
                                        <div className={cn(
                                          "h-5 w-5 rounded flex items-center justify-center",
                                          config.bgColor
                                        )}>
                                          <Icon className={cn("h-3 w-3", config.iconColor)} />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        {config.label}
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Permission Checkboxes per Role */}
                        {STAFF_ROLES.map((role) => (
                          <div key={role} className="px-2 py-3 flex flex-col items-center justify-center gap-1.5">
                            {PERMISSION_ACTIONS.map(action => {
                              const permKey = buildPermissionKey(perm.key, action);
                              const stateKey = `${permKey}.${role}`;
                              const checked = isChecked(permKey, role);
                              const toggleable = canToggle(role);
                              const isSaving = savingKey === stateKey;
                              const config = ACTION_CONFIG[action];

                              return (
                                <div 
                                  key={action}
                                  className="group relative"
                                >
                                  {isSaving ? (
                                    <div className="h-5 w-5 flex items-center justify-center">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    </div>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div 
                                          className={cn(
                                            "h-5 w-5 rounded transition-all duration-200 flex items-center justify-center cursor-pointer",
                                            checked ? config.bgColor : "bg-muted/50",
                                            toggleable && "hover:ring-2 hover:ring-primary/20",
                                            !toggleable && "cursor-not-allowed opacity-60"
                                          )}
                                          onClick={() => toggleable && handleToggle(permKey, role)}
                                        >
                                          <Checkbox
                                            checked={checked}
                                            disabled={!toggleable}
                                            className={cn(
                                              "h-3.5 w-3.5 border-0 bg-transparent data-[state=checked]:bg-transparent",
                                              checked ? config.iconColor : "text-muted-foreground/50"
                                            )}
                                            onCheckedChange={() => {}}
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">
                                        <p className="font-medium">{config.label}</p>
                                        {!toggleable && (
                                          <p className="text-muted-foreground">
                                            {role === 'owner' ? 'Owner is protected' : 'View only'}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
              <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Shield className="h-3 w-3" />
              </div>
              <p>
                Changes save instantly. Staff will see updated permissions after refreshing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ModulePermissionsMatrix;
