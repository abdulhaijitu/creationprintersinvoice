/**
 * PERMISSION CONTEXT - Global Permission State with Realtime Updates
 * 
 * This context provides:
 * 1. Single source of truth for permissions
 * 2. Realtime permission updates via Supabase Realtime
 * 3. Action-level permission checks (view, create, edit, delete)
 * 4. Module-level permission checks for sidebar
 * 5. Automatic redirect when permissions are revoked
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

// Permission actions
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

// Module name mappings
const MODULE_NAME_ALIASES: Record<string, string[]> = {
  dashboard: ['dashboard'],
  invoices: ['invoices'],
  quotations: ['quotations'],
  price_calculation: ['price_calculation', 'price_calculations'],
  challan: ['challan', 'delivery_challans'],
  customers: ['customers'],
  vendors: ['vendors'],
  expenses: ['expenses'],
  employees: ['employees'],
  attendance: ['attendance'],
  salary: ['salary'],
  leave: ['leave'],
  performance: ['performance'],
  tasks: ['tasks'],
  reports: ['reports'],
  team: ['team', 'team_members'],
  settings: ['settings'],
};

// Reverse lookup
const DB_TO_CANONICAL: Record<string, string> = {};
Object.entries(MODULE_NAME_ALIASES).forEach(([canonical, aliases]) => {
  aliases.forEach(alias => {
    DB_TO_CANONICAL[alias] = canonical;
  });
});

// Module to route mapping for redirect safety
const MODULE_ROUTES: Record<string, string> = {
  dashboard: '/dashboard',
  invoices: '/invoices',
  quotations: '/quotations',
  price_calculation: '/price-calculations',
  challan: '/delivery-challans',
  customers: '/customers',
  vendors: '/vendors',
  expenses: '/expenses',
  employees: '/employees',
  attendance: '/attendance',
  salary: '/salary',
  leave: '/leave',
  performance: '/performance',
  tasks: '/tasks',
  reports: '/reports',
  team: '/team',
  settings: '/settings',
};

// Route to module mapping
const ROUTE_TO_MODULE: Record<string, string> = {};
Object.entries(MODULE_ROUTES).forEach(([module, route]) => {
  ROUTE_TO_MODULE[route] = module;
});

interface PermissionContextType {
  // Core permission checks
  hasPermission: (permissionKey: string) => boolean;
  hasModuleAccess: (moduleKey: string) => boolean;
  hasAnyPermission: boolean;
  
  // Action-specific checks (convenience methods)
  canView: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  
  // Bulk check for manage actions (create OR edit OR delete)
  canManage: (module: string) => boolean;
  
  // State
  loading: boolean;
  permissionsReady: boolean;
  lastUpdated: number;
  
  // Actions
  refreshPermissions: () => Promise<void>;
  
  // Debug
  getEnabledModules: () => string[];
  getAllPermissions: () => Map<string, boolean>;
  
  // Context info
  orgRole: string | null;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

// Normalize module name
const normalizeModuleName = (moduleName: string): string => {
  return DB_TO_CANONICAL[moduleName] || moduleName;
};

// Extract module from sidebar key
const extractModuleFromKey = (key: string): string => {
  const parts = key.split('.');
  return parts[parts.length - 1];
};

// Get module aliases
const getModuleAliases = (canonicalName: string): string[] => {
  return MODULE_NAME_ALIASES[canonicalName] || [canonicalName];
};

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const { organization, orgRole, isOrgOwner, loading: orgLoading } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [permissionMap, setPermissionMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const isMountedRef = useRef(true);
  const previousPermissions = useRef<Map<string, boolean>>(new Map());

  /**
   * Fetch permissions from database
   */
  const fetchPermissions = useCallback(async () => {
    if (!organization?.id || orgLoading) {
      return;
    }

    // Super Admin and Owner bypass
    if (isSuperAdmin || isOrgOwner) {
      const allPermsMap = new Map<string, boolean>();
      Object.keys(MODULE_NAME_ALIASES).forEach(moduleName => {
        PERMISSION_ACTIONS.forEach(action => {
          allPermsMap.set(`${moduleName}.${action}`, true);
        });
      });
      
      if (isMountedRef.current) {
        setPermissionMap(allPermsMap);
        setLoading(false);
        setPermissionsReady(true);
        setLastUpdated(Date.now());
      }
      console.log('[PermissionContext] Super Admin/Owner - all permissions enabled');
      return;
    }

    if (!orgRole) {
      if (isMountedRef.current) {
        setPermissionMap(new Map());
        setLoading(false);
        setPermissionsReady(true);
      }
      return;
    }

    try {
      console.log(`[PermissionContext] Fetching permissions for org: ${organization.id}, role: ${orgRole}`);
      
      const { data, error } = await supabase
        .from('org_specific_permissions')
        .select('permission_key, is_enabled')
        .eq('organization_id', organization.id)
        .eq('role', orgRole);

      if (error) throw error;

      const normalizedMap = new Map<string, boolean>();
      
      (data || []).forEach(perm => {
        const [moduleRaw, action] = perm.permission_key.split('.');
        
        if (moduleRaw && action) {
          const canonicalModule = normalizeModuleName(moduleRaw);
          const canonicalKey = `${canonicalModule}.${action}`;
          
          normalizedMap.set(canonicalKey, perm.is_enabled);
          normalizedMap.set(perm.permission_key, perm.is_enabled);
        }
      });

      if (isMountedRef.current) {
        // Check for permission changes
        const previousMap = previousPermissions.current;
        const permissionsChanged = previousMap.size > 0 && 
          (normalizedMap.size !== previousMap.size ||
           Array.from(normalizedMap.entries()).some(([key, value]) => previousMap.get(key) !== value));

        if (permissionsChanged) {
          console.log('[PermissionContext] Permissions changed - checking access');
          toast.info('Your permissions have been updated', {
            description: 'Access levels have been refreshed.',
          });
          
          // Check if current route is still accessible
          checkCurrentRouteAccess(normalizedMap);
        }

        previousPermissions.current = new Map(normalizedMap);
        setPermissionMap(normalizedMap);
        setLastUpdated(Date.now());
        setLoading(false);
        setPermissionsReady(true);
      }

      console.log(`[PermissionContext] Loaded ${normalizedMap.size} permissions for role: ${orgRole}`);
    } catch (err) {
      console.error('[PermissionContext] Error fetching permissions:', err);
      if (isMountedRef.current) {
        setLoading(false);
        setPermissionsReady(true);
      }
    }
  }, [organization?.id, orgRole, isSuperAdmin, isOrgOwner, orgLoading]);

  /**
   * Check if current route is still accessible after permission change
   */
  const checkCurrentRouteAccess = useCallback((permsMap: Map<string, boolean>) => {
    const currentPath = location.pathname;
    
    // Find module for current route
    let currentModule: string | null = null;
    for (const [route, module] of Object.entries(ROUTE_TO_MODULE)) {
      if (currentPath.startsWith(route)) {
        currentModule = module;
        break;
      }
    }

    if (!currentModule) return; // Not a protected route

    // Check if user still has view access
    const aliases = getModuleAliases(currentModule);
    let hasAccess = false;

    for (const alias of aliases) {
      if (permsMap.get(`${alias}.view`) === true) {
        hasAccess = true;
        break;
      }
    }

    if (!hasAccess) {
      console.log(`[PermissionContext] Access revoked for ${currentModule}, redirecting...`);
      toast.warning('Your access to this page has been revoked', {
        description: 'Redirecting to dashboard...',
      });
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!orgLoading && organization?.id) {
      fetchPermissions();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPermissions, orgLoading, organization?.id]);

  // Realtime subscription for permission changes
  useEffect(() => {
    if (!organization?.id || !orgRole || isSuperAdmin || isOrgOwner) {
      return;
    }

    console.log('[PermissionContext] Setting up realtime subscription for permissions');

    const channel = supabase
      .channel(`permissions-${organization.id}-${orgRole}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_specific_permissions',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          console.log('[PermissionContext] Permission change detected:', payload);
          // Refetch all permissions on any change
          fetchPermissions();
        }
      )
      .subscribe((status) => {
        console.log('[PermissionContext] Realtime subscription status:', status);
      });

    return () => {
      console.log('[PermissionContext] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [organization?.id, orgRole, isSuperAdmin, isOrgOwner, fetchPermissions]);

  // Visibility change listener for tab focus refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isSuperAdmin && !isOrgOwner) {
        console.log('[PermissionContext] Tab became visible, refreshing permissions');
        fetchPermissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPermissions, isSuperAdmin, isOrgOwner]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permissionKey: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;
    return permissionMap.get(permissionKey) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Check if user has ANY permission for a module (for sidebar visibility)
   */
  const hasModuleAccess = useCallback((moduleKey: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    const moduleName = extractModuleFromKey(moduleKey);
    const canonicalName = normalizeModuleName(moduleName);
    const aliases = getModuleAliases(canonicalName);
    
    for (const alias of aliases) {
      for (const action of PERMISSION_ACTIONS) {
        if (permissionMap.get(`${alias}.${action}`) === true) {
          return true;
        }
      }
    }
    
    for (const action of PERMISSION_ACTIONS) {
      if (permissionMap.get(`${canonicalName}.${action}`) === true) {
        return true;
      }
    }

    return false;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Action-specific permission checks
   */
  const canView = useCallback((module: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    const moduleName = extractModuleFromKey(module);
    const normalized = normalizeModuleName(moduleName);
    return permissionMap.get(`${normalized}.view`) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner]);

  const canCreate = useCallback((module: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    const moduleName = extractModuleFromKey(module);
    const normalized = normalizeModuleName(moduleName);
    return permissionMap.get(`${normalized}.create`) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner]);

  const canEdit = useCallback((module: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    const moduleName = extractModuleFromKey(module);
    const normalized = normalizeModuleName(moduleName);
    return permissionMap.get(`${normalized}.edit`) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner]);

  const canDelete = useCallback((module: string): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    const moduleName = extractModuleFromKey(module);
    const normalized = normalizeModuleName(moduleName);
    return permissionMap.get(`${normalized}.delete`) === true;
  }, [permissionMap, isSuperAdmin, isOrgOwner]);

  /**
   * Check if user can manage (create OR edit OR delete)
   */
  const canManage = useCallback((module: string): boolean => {
    return canCreate(module) || canEdit(module) || canDelete(module);
  }, [canCreate, canEdit, canDelete]);

  /**
   * Check if user has at least one permission anywhere
   */
  const hasAnyPermission = useMemo((): boolean => {
    if (isSuperAdmin || isOrgOwner) return true;
    if (!orgRole) return false;

    for (const enabled of permissionMap.values()) {
      if (enabled) return true;
    }
    return false;
  }, [permissionMap, isSuperAdmin, isOrgOwner, orgRole]);

  /**
   * Get all enabled modules
   */
  const getEnabledModules = useCallback((): string[] => {
    const modules = new Set<string>();
    
    permissionMap.forEach((enabled, key) => {
      if (enabled) {
        const [moduleName] = key.split('.');
        if (moduleName) {
          modules.add(normalizeModuleName(moduleName));
        }
      }
    });
    
    return Array.from(modules);
  }, [permissionMap]);

  /**
   * Get all permissions map
   */
  const getAllPermissions = useCallback((): Map<string, boolean> => {
    return new Map(permissionMap);
  }, [permissionMap]);

  /**
   * Refresh permissions manually
   */
  const refreshPermissions = useCallback(async () => {
    console.log('[PermissionContext] Manual refresh triggered');
    await fetchPermissions();
  }, [fetchPermissions]);

  const value: PermissionContextType = {
    hasPermission,
    hasModuleAccess,
    hasAnyPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canManage,
    loading: loading || orgLoading,
    permissionsReady,
    lastUpdated,
    refreshPermissions,
    getEnabledModules,
    getAllPermissions,
    orgRole,
    isOrgOwner,
    isSuperAdmin,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
};

// Re-export for convenience
export { normalizeModuleName, extractModuleFromKey, getModuleAliases };
