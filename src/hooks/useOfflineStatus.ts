import { useState, useEffect, useCallback } from 'react';

interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = 'offline-action-queue';
const MAX_RETRIES = 3;

export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem(QUEUE_KEY);
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Failed to parse offline queue:', e);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Trigger sync when coming back online
        syncQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Add action to queue
  const addToQueue = useCallback((type: string, payload: any) => {
    const action: QueuedAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue(prev => [...prev, action]);
    return action.id;
  }, []);

  // Remove action from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(action => action.id !== id));
  }, []);

  // Process a single queued action
  const processAction = async (action: QueuedAction): Promise<boolean> => {
    try {
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');

      switch (action.type) {
        case 'create_customer':
          await supabase.from('customers').insert(action.payload);
          break;
        case 'update_customer':
          await supabase.from('customers').update(action.payload.data).eq('id', action.payload.id);
          break;
        case 'create_invoice':
          await supabase.from('invoices').insert(action.payload);
          break;
        case 'update_invoice':
          await supabase.from('invoices').update(action.payload.data).eq('id', action.payload.id);
          break;
        case 'create_expense':
          await supabase.from('expenses').insert(action.payload);
          break;
        case 'update_task':
          await supabase.from('tasks').update(action.payload.data).eq('id', action.payload.id);
          break;
        case 'mark_attendance':
          await supabase.from('employee_attendance').upsert(action.payload);
          break;
        default:
          console.warn('Unknown action type:', action.type);
          return true; // Remove unknown actions
      }
      return true;
    } catch (error) {
      console.error('Failed to process queued action:', error);
      return false;
    }
  };

  // Sync all queued actions
  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    const failedActions: QueuedAction[] = [];

    for (const action of queue) {
      const success = await processAction(action);
      if (!success) {
        if (action.retries < MAX_RETRIES) {
          failedActions.push({ ...action, retries: action.retries + 1 });
        }
        // Actions that exceed max retries are dropped
      }
    }

    setQueue(failedActions);
    setIsSyncing(false);
    setWasOffline(false);

    return queue.length - failedActions.length; // Return number of synced actions
  }, [isOnline, queue, isSyncing]);

  // Clear the queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(QUEUE_KEY);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    queue,
    queueLength: queue.length,
    isSyncing,
    addToQueue,
    removeFromQueue,
    syncQueue,
    clearQueue,
  };
};
