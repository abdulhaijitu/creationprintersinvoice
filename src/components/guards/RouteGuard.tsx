/**
 * Route Guard Components
 * 
 * CRITICAL: Prevents cross-app routing access between user and admin contexts.
 * 
 * RULES:
 * 1. User routes are NOT accessible from Super Admin context (without impersonation)
 * 2. Admin routes are NOT accessible when impersonating
 * 3. Shared components must NOT auto-fetch data
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteGuardProps {
  children: React.ReactNode;
  /** Required app context for this route */
  requiredContext: 'user' | 'super_admin' | 'any';
  /** Optional: redirect path on access denied */
  redirectPath?: string;
  /** Optional: show access denied UI instead of redirect */
  showAccessDenied?: boolean;
}

/**
 * Access Denied Display Component
 */
const AccessDeniedDisplay: React.FC<{ 
  reason: string;
  redirectPath: string;
}> = ({ reason, redirectPath }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Access Denied
          </AlertTitle>
          <AlertDescription className="mt-2">
            {reason}
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = redirectPath}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Route Guard - Enforces app context boundaries
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredContext,
  redirectPath = '/',
  showAccessDenied = false,
}) => {
  const { isSuperAdmin, loading } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();
  
  // Wait for auth to load
  if (loading) {
    return null;
  }
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Determine current effective context
  let currentContext: 'user' | 'super_admin' = 'user';
  if (isSuperAdmin && isAdminRoute && !isImpersonating) {
    currentContext = 'super_admin';
  }
  
  // Allow if any context is accepted
  if (requiredContext === 'any') {
    return <>{children}</>;
  }
  
  // Check context match
  if (requiredContext !== currentContext) {
    const reason = requiredContext === 'super_admin'
      ? 'This page is only accessible to platform administrators.'
      : 'This page is not accessible from the admin panel. Please exit impersonation or navigate to the user app.';
    
    if (showAccessDenied) {
      return <AccessDeniedDisplay reason={reason} redirectPath={redirectPath} />;
    }
    
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
};

/**
 * User App Route Guard - Only allows user context
 */
export const UserAppGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();
  
  // Super admin accessing user routes without impersonation = blocked
  if (isSuperAdmin && !isImpersonating && !location.pathname.startsWith('/admin')) {
    // Super admin trying to access user app without impersonation
    // Redirect to admin panel
    return <Navigate to="/admin" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Admin Route Guard - Only allows super admin context
 */
export const AdminRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useAuth();
  const { isImpersonating } = useImpersonation();
  
  // Block if not super admin
  if (!isSuperAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Block admin routes while impersonating
  if (isImpersonating) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

/**
 * Organization Context Guard - Blocks rendering if no org context
 */
export const OrgContextGuard: React.FC<{ 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const { isSuperAdmin } = useAuth();
  const { isImpersonating } = useImpersonation();
  
  // Super admin without impersonation should not render org-scoped components
  if (isSuperAdmin && !isImpersonating) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>Organization context required. Please impersonate an organization to view this content.</p>
      </div>
    );
  }
  
  return <>{children}</>;
};
