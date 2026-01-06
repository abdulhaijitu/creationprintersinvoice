import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  startedAt: string | null;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonationTarget: ImpersonationTarget | null;
  startImpersonation: (target: ImpersonationTarget) => Promise<boolean>;
  endImpersonation: () => void;
  canImpersonate: (target: ImpersonationTarget) => { allowed: boolean; reason?: string };
}

const STORAGE_KEY = 'printosaas_impersonation';

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSuperAdmin } = useAuth();
  const { logAuditEvent } = useEnhancedAudit();
  const navigate = useNavigate();

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
        startedAt: null,
      });
    }
  }, [user, state.isImpersonating]);

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
        },
        source: 'admin_panel',
      });

      setState({
        isImpersonating: true,
        target,
        originalAdminId: user?.id || null,
        startedAt: new Date().toISOString(),
      });

      toast.success(`Now impersonating ${target.organizationName}`);
      
      // Navigate to dashboard as the impersonated user
      navigate('/dashboard');
      
      return true;
    } catch (error) {
      console.error('Failed to start impersonation:', error);
      toast.error('Failed to start impersonation');
      return false;
    }
  }, [canImpersonate, user?.id, logAuditEvent, navigate]);

  const endImpersonation = useCallback(async () => {
    if (!state.isImpersonating || !state.target) {
      return;
    }

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
        },
        source: 'admin_panel',
      });

      toast.success('Returned to Super Admin mode');
    } catch (error) {
      console.error('Failed to log impersonation end:', error);
    }

    setState({
      isImpersonating: false,
      target: null,
      originalAdminId: null,
      startedAt: null,
    });

    // Navigate back to admin panel
    navigate('/admin');
  }, [state, logAuditEvent, navigate]);

  const value: ImpersonationContextType = {
    isImpersonating: state.isImpersonating,
    impersonationTarget: state.target,
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
