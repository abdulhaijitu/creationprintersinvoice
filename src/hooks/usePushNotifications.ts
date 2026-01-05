import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  loading: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    loading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, loading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
        loading: false,
      }));
    };

    checkSupport();
  }, []);

  // Request permission and subscribe
  const subscribe = useCallback(async () => {
    if (!state.isSupported || !user) return false;

    try {
      setState(prev => ({ ...prev, loading: true }));

      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState(prev => ({ ...prev, loading: false }));
        return false;
      }

      // For now, we'll use the Notification API directly for in-browser notifications
      // Full push notifications would require a VAPID key setup
      setState(prev => ({ ...prev, isSubscribed: true, loading: false }));
      
      // Save preference to localStorage
      localStorage.setItem('push-notifications-enabled', 'true');
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [state.isSupported, user]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isSubscribed: false }));
    localStorage.removeItem('push-notifications-enabled');
    return true;
  }, []);

  // Show a notification
  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isSupported || Notification.permission !== 'granted') {
      return;
    }

    new Notification(title, {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      ...options,
    });
  }, [state.isSupported]);

  // Check saved preference on mount
  useEffect(() => {
    const savedPref = localStorage.getItem('push-notifications-enabled');
    if (savedPref === 'true' && Notification.permission === 'granted') {
      setState(prev => ({ ...prev, isSubscribed: true }));
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    showNotification,
  };
};
