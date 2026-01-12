import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  OrgRole, 
  ORG_ROLE_DISPLAY, 
  ALL_ORG_ROLES,
  PermissionModule,
  PERMISSION_MATRIX,
  MODULE_DISPLAY,
  PermissionAction,
  ORG_ROLE_HIERARCHY
} from '@/lib/permissions/constants';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Save, 
  Loader2, 
  Eye, 
  Plus, 
  Edit, 
  Trash2,
  Lock,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface DbPermission {
  id: string;
  role: string;
  permission_key: string;
  permission_label: string;
  permission_category: string;
  is_enabled: boolean;
  is_protected: boolean;
}

// Generate permission key for a module/action combination
const getPermissionKey = (module: PermissionModule, action: PermissionAction): string => {
  return `${module}.${action}`;
};

// Parse permission key back to module/action
const parsePermissionKey = (key: string): { module: string; action: string } | null => {
  const parts = key.split('.');
  if (parts.length >= 2) {
    return { module: parts[0], action: parts[parts.length - 1] };
  }
  return null;
};

// Check if disabling would violate hierarchy (higher roles must have what lower roles have)
const wouldViolateHierarchy = (
  role: OrgRole,
  module: PermissionModule,
  action: PermissionAction,
  newValue: boolean,
  currentState: Map<string, boolean>
): { violates: boolean; reason: string } => {
  if (newValue) return { violates: false, reason: '' }; // Enabling is always allowed
  
  const roleLevel = ORG_ROLE_HIERARCHY[role];
  
  // Check if any lower role has this permission enabled
  for (const [r, level] of Object.entries(ORG_ROLE_HIERARCHY)) {
    if (level < roleLevel) {
      const key = `${module}.${action}.${r}`;
      if (currentState.get(key)) {
        return { 
          violates: true, 
          reason: `Cannot disable: ${ORG_ROLE_DISPLAY[r as OrgRole]} has this permission` 
        };
      }
    }
  }
  
  return { violates: false, reason: '' };
};

// Check if this is a protected permission for owner
const isProtectedOwnerPermission = (role: OrgRole, module: PermissionModule): boolean => {
  // Owner MUST have core access permissions
  const criticalModules: PermissionModule[] = ['dashboard', 'settings', 'billing', 'team_members'];
  return role === 'owner' && criticalModules.includes(module);
};

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

const ACTION_ICONS: Partial<Record<PermissionAction, React.ComponentType<{ className?: string }>>> = {
  view: Eye,
  manage: Edit,
  create: Plus,
  edit: Edit,
  delete: Trash2,
  bulk: Trash2,
  import: Plus,
  export: Eye,
};

export function EditablePermissionMatrix() {
  const { isSuperAdmin, user } = useAuth();
  const [dbPermissions, setDbPermissions] = useState<DbPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track local permission state: Map<"module.action.role", boolean>
  const [permissionState, setPermissionState] = useState<Map<string, boolean>>(new Map());
  const [originalState, setOriginalState] = useState<Map<string, boolean>>(new Map());
  
  // Track pending changes for save
  const [pendingChanges, setPendingChanges] = useState<Map<string, { id: string; newValue: boolean }>>(new Map());

  // Build initial state from PERMISSION_MATRIX (fallback) and DB permissions
  const buildPermissionState = useCallback((dbPerms: DbPermission[]): Map<string, boolean> => {
    const state = new Map<string, boolean>();
    
    // First, initialize from PERMISSION_MATRIX
    for (const module of Object.keys(PERMISSION_MATRIX) as PermissionModule[]) {
      for (const action of ACTIONS) {
        const allowedRoles = PERMISSION_MATRIX[module][action] || [];
        for (const role of ALL_ORG_ROLES) {
          const key = `${module}.${action}.${role}`;
          state.set(key, allowedRoles.includes(role));
        }
      }
    }
    
    // Then, override with database permissions
    for (const perm of dbPerms) {
      const parsed = parsePermissionKey(perm.permission_key);
      if (parsed && ACTIONS.includes(parsed.action as PermissionAction)) {
        const key = `${parsed.module}.${parsed.action}.${perm.role}`;
        state.set(key, perm.is_enabled);
      }
    }
    
    return state;
  }, []);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('org_role_permissions')
        .select('*')
        .order('role')
        .order('permission_key');

      if (error) throw error;
      
      setDbPermissions(data || []);
      const state = buildPermissionState(data || []);
      setPermissionState(new Map(state));
      setOriginalState(new Map(state));
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [buildPermissionState]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if permission is checked
  const isChecked = useCallback((module: PermissionModule, action: PermissionAction, role: OrgRole): boolean => {
    return permissionState.get(`${module}.${action}.${role}`) ?? false;
  }, [permissionState]);

  // Check if permission can be toggled
  const getToggleStatus = useCallback((
    module: PermissionModule, 
    action: PermissionAction, 
    role: OrgRole
  ): { disabled: boolean; reason: string } => {
    // Super admin required to edit
    if (!isSuperAdmin) {
      return { disabled: true, reason: 'Super Admin access required' };
    }
    
    // Protected owner permissions
    if (isProtectedOwnerPermission(role, module) && action === 'view') {
      return { disabled: true, reason: 'Owner must have access to critical modules' };
    }
    
    // Check hierarchy violation
    const currentChecked = isChecked(module, action, role);
    if (currentChecked) {
      const violation = wouldViolateHierarchy(role, module, action, false, permissionState);
      if (violation.violates) {
        return { disabled: true, reason: violation.reason };
      }
    }
    
    return { disabled: false, reason: '' };
  }, [isSuperAdmin, isChecked, permissionState]);

  // Handle permission toggle
  const handleToggle = useCallback((module: PermissionModule, action: PermissionAction, role: OrgRole) => {
    const stateKey = `${module}.${action}.${role}`;
    const currentValue = permissionState.get(stateKey) ?? false;
    const newValue = !currentValue;
    
    // Update local state immediately
    setPermissionState(prev => {
      const next = new Map(prev);
      next.set(stateKey, newValue);
      return next;
    });
    
    // Find or create the DB permission entry
    const permKey = getPermissionKey(module, action);
    const dbPerm = dbPermissions.find(p => p.role === role && p.permission_key === permKey);
    
    // Track the change
    setPendingChanges(prev => {
      const next = new Map(prev);
      const originalValue = originalState.get(stateKey);
      
      if (newValue === originalValue) {
        // Value reverted to original, remove from pending
        next.delete(stateKey);
      } else {
        next.set(stateKey, { 
          id: dbPerm?.id || '', 
          newValue 
        });
      }
      return next;
    });
  }, [permissionState, originalState, dbPermissions]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => pendingChanges.size > 0, [pendingChanges]);

  // Save all changes
  const handleSave = async () => {
    if (!hasChanges || !isSuperAdmin) return;
    
    setSaving(true);
    try {
      // Prepare updates for edge function
      const updates: { permissionId: string; isEnabled: boolean }[] = [];
      
      for (const [key, change] of pendingChanges) {
        if (change.id) {
          updates.push({ permissionId: change.id, isEnabled: change.newValue });
        }
      }
      
      if (updates.length === 0) {
        toast.info('No database changes to save');
        setPendingChanges(new Map());
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      const response = await supabase.functions.invoke('update-role-permissions', {
        body: { updates, adminEmail: user?.email },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const result = response.data;
      
      if (result.success) {
        toast.success(result.message || 'Permissions updated successfully');
        // Refresh to get the latest state
        await fetchPermissions();
      } else {
        // Partial success or failure
        const failedCount = result.results?.filter((r: any) => !r.success).length || 0;
        if (failedCount > 0) {
          toast.warning(`${failedCount} permission(s) could not be updated`);
        } else {
          toast.error(result.error || 'Failed to update permissions');
        }
        // Refresh to sync state
        await fetchPermissions();
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original state
  const handleReset = useCallback(() => {
    setPermissionState(new Map(originalState));
    setPendingChanges(new Map());
  }, [originalState]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const modules = Object.keys(PERMISSION_MATRIX) as PermissionModule[];

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Configure permissions for each role. Changes are saved to the database.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || saving || !isSuperAdmin}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Changes
              {hasChanges && (
                <span className="ml-1 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
                  {pendingChanges.size}
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!isSuperAdmin && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-2 text-sm text-warning">
              <AlertCircle className="h-4 w-4" />
              <span>View-only mode. Super Admin access is required to edit permissions.</span>
            </div>
          )}
          
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[140px]">Module</TableHead>
                  <TableHead className="text-center min-w-[80px]">Action</TableHead>
                  {ALL_ORG_ROLES.map((role) => (
                    <TableHead key={role} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{ORG_ROLE_DISPLAY[role]}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          L{ORG_ROLE_HIERARCHY[role]}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  ACTIONS.map((action, actionIdx) => {
                    // Skip actions not defined for this module
                    if (!PERMISSION_MATRIX[module][action]) return null;
                    
                    const ActionIcon = ACTION_ICONS[action];
                    const isFirstAction = actionIdx === 0 || 
                      ACTIONS.slice(0, actionIdx).every(a => !PERMISSION_MATRIX[module][a]);
                    const actionsCount = ACTIONS.filter(a => PERMISSION_MATRIX[module][a]).length;
                    
                    return (
                      <TableRow key={`${module}-${action}`}>
                        {isFirstAction && (
                          <TableCell 
                            rowSpan={actionsCount} 
                            className="font-medium sticky left-0 bg-background border-r align-top pt-4"
                          >
                            {MODULE_DISPLAY[module]}
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs capitalize">{action}</span>
                          </div>
                        </TableCell>
                        {ALL_ORG_ROLES.map((role) => {
                          const stateKey = `${module}.${action}.${role}`;
                          const checked = isChecked(module, action, role);
                          const { disabled, reason } = getToggleStatus(module, action, role);
                          const isPending = pendingChanges.has(stateKey);
                          
                          return (
                            <TableCell key={role} className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center">
                                    <div className="relative">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => {
                                          if (!disabled) {
                                            handleToggle(module, action, role);
                                          }
                                        }}
                                        disabled={disabled}
                                        className={`
                                          ${isPending ? 'ring-2 ring-primary ring-offset-1' : ''}
                                          ${disabled && checked ? 'opacity-70' : ''}
                                        `}
                                      />
                                      {disabled && reason && (
                                        <Lock className="absolute -top-1 -right-1 h-2.5 w-2.5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                {disabled && reason && (
                                  <TooltipContent>
                                    <p className="text-xs">{reason}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Protected permission</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded ring-2 ring-primary ring-offset-1" />
                <span>Pending change</span>
              </div>
            </div>
            <div>
              L = Role hierarchy level (higher = more permissions)
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
