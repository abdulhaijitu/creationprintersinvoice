/**
 * Loading state management hook
 * Provides unified loading, error, and empty state handling
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type LoadingStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseLoadingStateOptions<T> {
  /** Initial data to use (e.g., from cache) */
  initialData?: T;
  /** Callback when data is successfully loaded */
  onSuccess?: (data: T) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

interface LoadingState<T> {
  data: T | null;
  status: LoadingStatus;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
}

interface UseLoadingStateReturn<T> extends LoadingState<T> {
  /** Execute the async operation */
  execute: (fn: () => Promise<T>) => Promise<void>;
  /** Retry the last operation */
  retry: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
  /** Set data directly (for optimistic updates) */
  setData: (data: T | ((prev: T | null) => T)) => void;
  /** Whether a retry is in progress */
  isRetrying: boolean;
}

export function useLoadingState<T>(
  options: UseLoadingStateOptions<T> = {}
): UseLoadingStateReturn<T> {
  const { initialData, onSuccess, onError } = options;
  
  const [data, setDataState] = useState<T | null>(initialData ?? null);
  const [status, setStatus] = useState<LoadingStatus>(initialData ? 'success' : 'idle');
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const lastFnRef = useRef<(() => Promise<T>) | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  const execute = useCallback(async (fn: () => Promise<T>) => {
    lastFnRef.current = fn;
    
    // Only show loading if we don't have data
    if (!data) {
      setStatus('loading');
    }
    setError(null);
    
    try {
      const result = await fn();
      
      if (!mountedRef.current) return;
      
      setDataState(result);
      setStatus('success');
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [data, onSuccess, onError]);
  
  const retry = useCallback(async () => {
    if (!lastFnRef.current) return;
    
    setIsRetrying(true);
    try {
      await execute(lastFnRef.current);
    } finally {
      if (mountedRef.current) {
        setIsRetrying(false);
      }
    }
  }, [execute]);
  
  const reset = useCallback(() => {
    setDataState(initialData ?? null);
    setStatus(initialData ? 'success' : 'idle');
    setError(null);
    lastFnRef.current = null;
  }, [initialData]);
  
  const setData = useCallback((newData: T | ((prev: T | null) => T)) => {
    setDataState(prev => 
      typeof newData === 'function' 
        ? (newData as (prev: T | null) => T)(prev) 
        : newData
    );
    setStatus('success');
  }, []);
  
  // Derive boolean states
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isEmpty = isSuccess && (
    data === null || 
    data === undefined || 
    (Array.isArray(data) && data.length === 0)
  );
  
  return {
    data,
    status,
    error,
    isLoading,
    isError,
    isSuccess,
    isEmpty,
    execute,
    retry,
    reset,
    setData,
    isRetrying,
  };
}

/**
 * Hook for tracking button/action loading states
 * Useful for form submissions, delete operations, etc.
 */
export function useActionState() {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set());
  
  const startAction = useCallback((actionId: string) => {
    setLoadingActions(prev => new Set(prev).add(actionId));
  }, []);
  
  const endAction = useCallback((actionId: string) => {
    setLoadingActions(prev => {
      const next = new Set(prev);
      next.delete(actionId);
      return next;
    });
  }, []);
  
  const isActionLoading = useCallback((actionId: string) => {
    return loadingActions.has(actionId);
  }, [loadingActions]);
  
  const withAction = useCallback(async <T,>(
    actionId: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    startAction(actionId);
    try {
      return await fn();
    } finally {
      endAction(actionId);
    }
  }, [startAction, endAction]);
  
  return {
    isActionLoading,
    startAction,
    endAction,
    withAction,
    hasAnyLoading: loadingActions.size > 0,
  };
}
