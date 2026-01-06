import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePasswordResetCheck = () => {
  const [mustResetPassword, setMustResetPassword] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkResetStatus = async () => {
      // Skip check if still loading auth or no user
      if (authLoading) return;
      
      if (!user) {
        setChecking(false);
        setMustResetPassword(false);
        return;
      }

      // Don't check if already on reset password page
      if (location.pathname === '/reset-password') {
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('must_reset_password')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking password reset status:', error);
          setMustResetPassword(false);
          setChecking(false);
          return;
        }

        const needsReset = data?.must_reset_password ?? false;
        setMustResetPassword(needsReset);

        // If user must reset password and not on reset page, redirect
        if (needsReset && location.pathname !== '/reset-password') {
          // Log first login event
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

          if (memberData?.organization_id) {
            await supabase.rpc('log_password_reset_event', {
              p_user_id: user.id,
              p_organization_id: memberData.organization_id,
              p_action_type: 'create',
              p_source: 'first_login',
            });
          }

          navigate('/reset-password', { replace: true });
        }

        setChecking(false);
      } catch (error) {
        console.error('Error:', error);
        setMustResetPassword(false);
        setChecking(false);
      }
    };

    checkResetStatus();
  }, [user, authLoading, navigate, location.pathname]);

  return { mustResetPassword, checking };
};
