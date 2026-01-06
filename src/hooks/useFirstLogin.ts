import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useFirstLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFirstLogin = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_login_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking first login status:', error);
          setLoading(false);
          return;
        }

        // Show welcome screen if first_login_completed is false
        setShowWelcome(profile?.first_login_completed === false);
      } catch (error) {
        console.error('Error in first login check:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkFirstLogin();
    }
  }, [user, authLoading]);

  const completeFirstLogin = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_login_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error completing first login:', error);
        return;
      }

      // Log audit event
      await supabase.functions.invoke('audit-log', {
        body: {
          actor_id: user.id,
          actor_email: user.email,
          action_type: 'update',
          action_label: 'First login welcome completed',
          entity_type: 'user',
          entity_id: user.id,
          metadata: { event: 'welcome_screen_completed' }
        }
      });

      setShowWelcome(false);
    } catch (error) {
      console.error('Error completing first login:', error);
    }
  };

  return { showWelcome, loading, completeFirstLogin };
};
