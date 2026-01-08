import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// System-level role for platform administration
// Note: Organization roles are defined in src/lib/permissions/constants.ts as OrgRole
export type AppRole = 'super_admin' | 'owner' | 'manager' | 'accounts' | 'sales_staff' | 'designer' | 'employee';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  isAccounts: boolean;
  isSalesStaff: boolean;
  isDesigner: boolean;
  hasPrivilegedAccess: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
        return null;
      }
      return data?.role as AppRole;
    } catch (error) {
      console.error('Error fetching role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch role after a small delay to ensure the trigger has completed
          setTimeout(async () => {
            const userRole = await fetchUserRole(session.user.id);
            setRole(userRole);
            setLoading(false);
          }, 100);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userRole = await fetchUserRole(session.user.id);
        setRole(userRole);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'owner' || role === 'super_admin';
  const isManager = role === 'manager';
  const isAccounts = role === 'accounts';
  const isSalesStaff = role === 'sales_staff';
  const isDesigner = role === 'designer';
  const hasPrivilegedAccess = isSuperAdmin || isAdmin || isManager || isAccounts;

  const value = {
    user,
    session,
    loading,
    role,
    isAdmin,
    isSuperAdmin,
    isManager,
    isAccounts,
    isSalesStaff,
    isDesigner,
    hasPrivilegedAccess,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
