/**
 * Module Permissions Matrix Component
 * 
 * Allows organization owners to configure module-based permissions for staff roles.
 * Uses the new module-based permission system (main.dashboard, business.customers, etc.)
 * 
 * CRITICAL RULES:
 * - Super Admin always has all permissions (locked ON)
 * - Owner role always has all permissions (locked ON)
 * - Changes persist to database immediately
 * - Sidebar visibility updates on next navigation
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { invalidateModulePermissionCache } from '@/hooks/useModulePermissions';
import { 
  ALL_MODULE_PERMISSIONS,
  PERMISSIONS_BY_CATEGORY,
  CATEGORY_DISPLAY,
  type ModulePermission,
  type PermissionCategory,
} from '@/lib/permissions/modulePermissions';
import { OrgRole, ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { 
  Lock,
  Check,
  Loader2,
  Shield,
  ShieldCheck,
  Info,
  RefreshCw,
  AlertTriangle,
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

// Ordered categories for display
const CATEGORY_ORDER: PermissionCategory[] = ['main', 'business', 'hr_ops', 'system'];

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
  
  // Permission state: Map<"permissionKey.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(new Map());

  /**
   * Build initial state - defaults to false (no access) unless explicitly enabled
   */
  const buildPermissionState = useCallback((orgPerms: OrgModulePermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    // Initialize all permissions as false (no access by default)
    for (const perm of ALL_MODULE_PERMISSIONS) {
      for (const role of STAFF_ROLES) {
        const key = `${perm.key}.${role}`;
        state.set(key, false);
      }
    }
    
    // Override with org-specific permissions from database
    for (const perm of orgPerms) {
      const key = `${perm.permission_key}.${perm.role}`;
      state.set(key, perm.is_enabled);
    }
    
    return state;
  }, []);

  /**
   * Fetch permissions from database
   */
  const fetchPermissions = useCallback(async (showToast = false) => {
    if (!organization) return;
    
    setLoading(true);
    try {
      console.log(`[ModulePermissionsMatrix] Fetching permissions for org: ${organization.id}`);
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
      console.log(`[ModulePermissionsMatrix] Loaded ${perms.length} permissions`);
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

  /**
   * Check if permission is enabled
   */
  const isChecked = useCallback((permissionKey: string, role: OrgRole): boolean => {
    // Owner always has all permissions
    if (role === 'owner') return true;
    return permissionState.get(`${permissionKey}.${role}`) ?? false;
  }, [permissionState]);

  /**
   * Check if permission can be toggled
   */
  const canToggle = useCallback((role: OrgRole): boolean => {
    // Only owner or super admin can edit permissions
    if (!isOrgOwner && !isSuperAdmin) return false;
    // Owner's permissions are locked
    if (role === 'owner') return false;
    return true;
  }, [isOrgOwner, isSuperAdmin]);

  /**
   * Handle permission toggle with immediate database persistence
   */
  const handleToggle = async (permissionKey: string, role: OrgRole) => {
    if (!organization || !canToggle(role)) return;

    const stateKey = `${permissionKey}.${role}`;
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    // Optimistic update
    const newPermissionState = new Map(permissionState);
    newPermissionState.set(stateKey, newValue);
    setPermissionState(newPermissionState);
    
    setSavingKey(stateKey);

    try {
      // Check if we have an existing permission
      const existing = orgPermissions.find(
        p => p.permission_key === permissionKey && p.role === role
      );

      let newOrgPermissions: OrgModulePermission[];

      if (existing) {
        // Update existing permission
        console.log(`[ModulePermissionsMatrix] Updating ${permissionKey} for ${role} to ${newValue}`);
        const { error, data } = await supabase
          .from('org_specific_permissions')
          .update({ is_enabled: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        newOrgPermissions = orgPermissions.map(p => 
          p.id === existing.id ? { ...p, is_enabled: newValue } : p
        );
      } else {
        // Create new permission
        console.log(`[ModulePermissionsMatrix] Creating ${permissionKey} for ${role} = ${newValue}`);
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
      
      // Invalidate cache so sidebar updates
      invalidateModulePermissionCache(organization.id);
      
      // Notify parent
      onPermissionsChanged?.();
      
      toast.success(`${newValue ? 'Enabled' : 'Disabled'} ${permissionKey.split('.')[1]} access`, { 
        duration: 1500 
      });
    } catch (error) {
      console.error('[ModulePermissionsMatrix] Error updating permission:', error);
      // Revert on failure
      const revertedState = new Map(permissionState);
      revertedState.set(stateKey, currentValue);
      setPermissionState(revertedState);
      toast.error('Failed to save permission. Please try again.');
    } finally {
      setSavingKey(null);
    }
  };

  // Access control
  if (!isOrgOwner && !isSuperAdmin) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Access Restricted</h3>
              <p className="text-sm text-muted-foreground">
                Only organization owners can manage permissions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Module Permissions</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPermissions(true)}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Control which modules each role can access. Super Admin and Owner always have full access.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Legend */}
          <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border bg-primary/20 flex items-center justify-center">
                <Check className="h-3 w-3 text-primary" />
              </div>
              <span>Has Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              <span>Owner (Locked ON)</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5" />
              <span>Disabled = Hidden from sidebar</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px] font-semibold">
                    Module
                  </TableHead>
                  {STAFF_ROLES.map((role) => (
                    <TableHead key={role} className="text-center min-w-[100px]">
                      <Badge variant="outline" className="text-xs font-normal">
                        {ORG_ROLE_DISPLAY[role]}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CATEGORY_ORDER.map((category) => (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <TableRow className="bg-muted/20">
                      <TableCell 
                        colSpan={STAFF_ROLES.length + 1} 
                        className="font-medium text-xs text-muted-foreground uppercase tracking-wider py-2"
                      >
                        {CATEGORY_DISPLAY[category].label}
                      </TableCell>
                    </TableRow>
                    
                    {/* Permission Rows */}
                    {PERMISSIONS_BY_CATEGORY[category].map((perm) => (
                      <TableRow 
                        key={perm.key}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="sticky left-0 bg-background border-r">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{perm.label}</span>
                            <span className="text-xs text-muted-foreground">{perm.description}</span>
                          </div>
                        </TableCell>
                        
                        {STAFF_ROLES.map((role) => {
                          const stateKey = `${perm.key}.${role}`;
                          const checked = isChecked(perm.key, role);
                          const toggleable = canToggle(role);
                          const isSaving = savingKey === stateKey;
                          
                          return (
                            <TableCell key={role} className="text-center py-3">
                              <div className="flex items-center justify-center">
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="relative">
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => {
                                            if (toggleable) {
                                              handleToggle(perm.key, role);
                                            }
                                          }}
                                          disabled={!toggleable}
                                          className={cn(
                                            'transition-all duration-200',
                                            !toggleable && 'opacity-60 cursor-not-allowed'
                                          )}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    {!toggleable && (
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {role === 'owner' 
                                            ? 'Owner permissions are protected'
                                            : 'Only owners can edit permissions'
                                          }
                                        </p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/20">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Important:</strong> Changes are saved immediately. 
                Staff will see updated sidebar access after refreshing their browser.
                Disabled modules will be completely hidden (no greyed-out items).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default ModulePermissionsMatrix;
