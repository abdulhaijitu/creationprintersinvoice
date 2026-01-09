/**
 * App Context - Multi-Tenant Isolation Layer
 * 
 * CRITICAL: This context defines the application context (user app vs super admin app)
 * and ensures complete data isolation between contexts.
 * 
 * RULES:
 * 1. User App: Only sees data from their active organization
 * 2. Super Admin App: NEVER sees organization business data
 * 3. Super Admin can only see org data when IMPERSONATING
 * 4. Context switches MUST clear all cached data
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

// App context types
export type AppContextType = 'user' | 'super_admin';

// Session context includes role and org_id for complete security
interface SessionContext {
  appContext: AppContextType;
  organizationId: string | null;
  userId: string | null;
  role: string | null;
  isImpersonating: boolean;
}

interface AppContextState {
  /** Current application context */
  appContext: AppContextType;
  
  /** Full session context for security checks */
  sessionContext: SessionContext;
  
  /** Whether user is in Super Admin mode (not impersonating) */
  isSuperAdminMode: boolean;
  
  /** Whether business data queries should be blocked */
  shouldBlockBusinessData: boolean;
  
  /** Clear all cached data (use on context switch) */
  clearAllCachedData: () => void;
  
  /** Validate if fetched data belongs to current context */
  validateDataContext: (dataOrgId: string | null) => boolean;
}

const IMPERSONATION_STORAGE_KEY = 'printosaas_impersonation';

const AppContext = createContext<AppContextState | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin, role } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Track previous context to detect switches
  const prevContextRef = useRef<AppContextType | null>(null);
  
  // Check if impersonating from session storage
  const getImpersonationState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.isImpersonating && parsed.target?.organizationId) {
          return {
            isImpersonating: true,
            organizationId: parsed.target.organizationId,
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
    return { isImpersonating: false, organizationId: null };
  }, []);
  
  // Determine current app context based on route and user role
  const [state, setState] = useState<AppContextState>(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const impersonation = getImpersonationState();
    
    // Determine app context
    let appContext: AppContextType = 'user';
    if (isSuperAdmin && isAdminRoute && !impersonation.isImpersonating) {
      appContext = 'super_admin';
    }
    
    return {
      appContext,
      sessionContext: {
        appContext,
        organizationId: null,
        userId: user?.id || null,
        role: role || null,
        isImpersonating: impersonation.isImpersonating,
      },
      isSuperAdminMode: appContext === 'super_admin',
      shouldBlockBusinessData: appContext === 'super_admin' && !impersonation.isImpersonating,
      clearAllCachedData: () => {},
      validateDataContext: () => true,
    };
  });
  
  // Function to clear all cached data
  const clearAllCachedData = useCallback(() => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear any component-level caches
    console.log('[AppContext] Cleared all cached data for context switch');
  }, [queryClient]);
  
  // Validate that fetched data belongs to current organization
  const validateDataContext = useCallback((dataOrgId: string | null): boolean => {
    const impersonation = getImpersonationState();
    
    // In super admin mode (not impersonating), no business data should exist
    if (state.isSuperAdminMode && !impersonation.isImpersonating) {
      console.warn('[AppContext] Business data validation failed: Super Admin mode without impersonation');
      return false;
    }
    
    // If impersonating, data must match impersonated org
    if (impersonation.isImpersonating && impersonation.organizationId) {
      if (dataOrgId !== impersonation.organizationId) {
        console.warn('[AppContext] Data org mismatch during impersonation:', dataOrgId, 'vs', impersonation.organizationId);
        return false;
      }
    }
    
    return true;
  }, [state.isSuperAdminMode, getImpersonationState]);
  
  // Update context when route or auth state changes
  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const impersonation = getImpersonationState();
    
    // Determine new app context
    let newAppContext: AppContextType = 'user';
    if (isSuperAdmin && isAdminRoute && !impersonation.isImpersonating) {
      newAppContext = 'super_admin';
    }
    
    // Check for context switch
    const contextSwitched = prevContextRef.current !== null && prevContextRef.current !== newAppContext;
    
    if (contextSwitched) {
      console.log('[AppContext] Context switch detected:', prevContextRef.current, '->', newAppContext);
      // CRITICAL: Clear all cached data on context switch
      clearAllCachedData();
    }
    
    prevContextRef.current = newAppContext;
    
    setState({
      appContext: newAppContext,
      sessionContext: {
        appContext: newAppContext,
        organizationId: impersonation.organizationId,
        userId: user?.id || null,
        role: role || null,
        isImpersonating: impersonation.isImpersonating,
      },
      isSuperAdminMode: newAppContext === 'super_admin',
      shouldBlockBusinessData: newAppContext === 'super_admin' && !impersonation.isImpersonating,
      clearAllCachedData,
      validateDataContext,
    });
  }, [location.pathname, isSuperAdmin, user?.id, role, getImpersonationState, clearAllCachedData, validateDataContext]);
  
  // Listen for impersonation changes
  useEffect(() => {
    const handleImpersonationChange = () => {
      const impersonation = getImpersonationState();
      const isAdminRoute = location.pathname.startsWith('/admin');
      
      // Clear all data when impersonation state changes
      clearAllCachedData();
      
      let newAppContext: AppContextType = 'user';
      if (isSuperAdmin && isAdminRoute && !impersonation.isImpersonating) {
        newAppContext = 'super_admin';
      }
      
      prevContextRef.current = newAppContext;
      
      setState(prev => ({
        ...prev,
        appContext: newAppContext,
        sessionContext: {
          ...prev.sessionContext,
          appContext: newAppContext,
          organizationId: impersonation.organizationId,
          isImpersonating: impersonation.isImpersonating,
        },
        isSuperAdminMode: newAppContext === 'super_admin',
        shouldBlockBusinessData: newAppContext === 'super_admin' && !impersonation.isImpersonating,
      }));
    };
    
    window.addEventListener('impersonation-changed', handleImpersonationChange);
    return () => window.removeEventListener('impersonation-changed', handleImpersonationChange);
  }, [getImpersonationState, clearAllCachedData, location.pathname, isSuperAdmin]);
  
  return (
    <AppContext.Provider value={state}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};

/**
 * Hook to check if current context allows business data access
 * Returns false if in Super Admin mode without impersonation
 */
export const useCanAccessBusinessData = (): boolean => {
  const { shouldBlockBusinessData } = useAppContext();
  return !shouldBlockBusinessData;
};

/**
 * Hook for runtime data validation
 * Use this to validate fetched data belongs to the current context
 */
export const useDataContextValidator = () => {
  const { validateDataContext, shouldBlockBusinessData } = useAppContext();
  
  return {
    /**
     * Validate a single data item - discards if context mismatch
     */
    validateItem: <T extends { organization_id?: string | null }>(item: T | null): T | null => {
      if (!item) return null;
      if (shouldBlockBusinessData) {
        console.warn('[DataValidator] Blocking business data in Super Admin mode');
        return null;
      }
      if (!validateDataContext(item.organization_id || null)) {
        return null;
      }
      return item;
    },
    
    /**
     * Filter an array of items - removes items with context mismatch
     */
    filterItems: <T extends { organization_id?: string | null }>(items: T[]): T[] => {
      if (shouldBlockBusinessData) {
        console.warn('[DataValidator] Blocking all business data items in Super Admin mode');
        return [];
      }
      return items.filter(item => validateDataContext(item.organization_id || null));
    },
  };
};
