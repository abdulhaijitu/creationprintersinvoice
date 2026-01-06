import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useEnhancedAudit } from '@/hooks/useEnhancedAudit';
import { toast } from 'sonner';

interface ImpersonationTarget {
  organizationId: string;
  organizationName: string;
  ownerId: string;
  ownerEmail: string;
  subscriptionStatus?: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  target: ImpersonationTarget | null;
  originalAdminId: string | null;
  originalAdminEmail: string | null;
  startedAt: string | null;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationTarget: ImpersonationTarget | null;
  originalAdminId: string | null;
  isStarting: boolean;
  isEnding: boolean;
  startImpersonation: (target: ImpersonationTarget) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
  canImpersonate: (target: ImpersonationTarget) => { allowed: boolean; reason?: string };
}

const STORAGE_KEY = 'printosaas_impersonation';

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const { logAuditEvent } = useEnhancedAudit();
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingRef = useRef(false);

  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const [state, setState] = useState<ImpersonationState>(() => {
    // Restore from session storage on mount
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate stored state
        if (parsed.originalAdminId && parsed.target) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to restore impersonation state:', e);
    }
    return {
      isImpersonating: false,
      target: null,
      originalAdminId: null,
      originalAdminEmail: null,
      startedAt: null,
    };
  });

  // Persist state to session storage
  useEffect(() => {
    if (state.isImpersonating) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  // Security check: Clear impersonation if user changes (session timeout, logout)
  useEffect(() => {
    if (!user && state.isImpersonating) {
      setState({
        isImpersonating: false,
        target: null,
        originalAdminId: null,
        originalAdminEmail: null,
        startedAt: null,
      });
    }
  }, [user, state.isImpersonating]);

  // Block access to admin routes while impersonating
  useEffect(() => {
    if (state.isImpersonating && location.pathname.startsWith('/admin') && !isNavigatingRef.current) {
      toast.error('Cannot access admin panel while impersonating');
      navigate('/', { replace: true });
    }
  }, [state.isImpersonating, location.pathname, navigate]);

  const canImpersonate = useCallback((target: ImpersonationTarget): { allowed: boolean; reason?: string } => {
    // Only Super Admins can impersonate
    if (!isSuperAdmin) {
      return { allowed: false, reason: 'Only Super Admins can impersonate users' };
    }

    // Prevent nested impersonation
    if (state.isImpersonating) {
      return { allowed: false, reason: 'Already impersonating another user' };
    }

    // Check if owner account might be disabled (no ownerId)
    if (!target.ownerId) {
      return { allowed: false, reason: 'Owner account not found or disabled' };
    }

    return { allowed: true };
  }, [isSuperAdmin, state.isImpersonating]);

  const startImpersonation = useCallback(async (target: ImpersonationTarget): Promise<boolean> => {
    const check = canImpersonate(target);
    if (!check.allowed) {
      toast.error(check.reason || 'Cannot impersonate this user');
      return false;
    }

    setIsStarting(true);

    try {
      // Log impersonation start
      await logAuditEvent({
        action_type: 'impersonate_start',
        action_label: `Started impersonating ${target.organizationName} owner`,
        entity_type: 'user',
        entity_id: target.ownerId,
        entity_name: target.ownerEmail,
        organization_id: target.organizationId,
        organization_name: target.organizationName,
        metadata: {
          target_owner_email: target.ownerEmail,
          subscription_status: target.subscriptionStatus,
          source: 'Admin Impersonation Modal',
        },
        source: 'ui',
      });

      setState({
        isImpersonating: true,
        target,
        originalAdminId: user?.id || null,
        originalAdminEmail: user?.email || null,
        startedAt: new Date().toISOString(),
      });

      toast.success(`Now impersonating ${target.organizationName}`, {
        description: 'You are now viewing as the organization owner',
      });
      
      // Dispatch custom event to notify OrganizationContext to refetch
      window.dispatchEvent(new CustomEvent('impersonation-changed'));
      
      // Navigate to organization dashboard (root route, not /dashboard)
      isNavigatingRef.current = true;
      navigate('/');
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Failed to start impersonation:', error);
      toast.error('Failed to start impersonation');
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [canImpersonate, user?.id, user?.email, logAuditEvent, navigate]);

  const endImpersonation = useCallback(async () => {
    if (!state.isImpersonating || !state.target) {
      return;
    }

    setIsEnding(true);

    try {
      // Log impersonation end
      await logAuditEvent({
        action_type: 'impersonate_end',
        action_label: `Ended impersonation of ${state.target.organizationName} owner`,
        entity_type: 'user',
        entity_id: state.target.ownerId,
        entity_name: state.target.ownerEmail,
        organization_id: state.target.organizationId,
        organization_name: state.target.organizationName,
        metadata: {
          duration_seconds: state.startedAt 
            ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 1000)
            : null,
          source: 'Impersonation Banner',
        },
        source: 'ui',
      });

      toast.success('Returned to Super Admin mode');
    } catch (error) {
      console.error('Failed to log impersonation end:', error);
    }

    setState({
      isImpersonating: false,
      target: null,
      originalAdminId: null,
      originalAdminEmail: null,
      startedAt: null,
    });

    // Dispatch custom event to notify OrganizationContext to refetch
    window.dispatchEvent(new CustomEvent('impersonation-changed'));

    // Navigate back to admin panel
    isNavigatingRef.current = true;
    navigate('/admin');
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);

    setIsEnding(false);
  }, [state, logAuditEvent, navigate]);

  const value: ImpersonationContextType = {
    isImpersonating: state.isImpersonating,
    impersonationTarget: state.target,
    originalAdminId: state.originalAdminId,
    isStarting,
    isEnding,
    startImpersonation,
    endImpersonation,
    canImpersonate,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
};
