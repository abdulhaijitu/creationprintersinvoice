/**
 * useDataFetch - Unified data fetching hook with caching and loading state management
 * 
 * Features:
 * - Automatic caching with configurable TTL
 * - Prevents refetch on navigation if data is fresh
 * - Optimistic updates support
 * - Error and retry handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// Module-level cache for cross-component data sharing
const dataCache = new Map<string, CacheEntry<unknown>>();

interface UseDataFetchOptions<T> {
  /** Unique cache key - include org ID for proper isolation */
  cacheKey: string;
  /** Time in ms before cached data is considered stale (default: 30s) */
  cacheTTL?: number;
  /** Skip initial fetch */
  skip?: boolean;
  /** Initial data (e.g., from props) */
  initialData?: T;
  /** Called on successful fetch */
  onSuccess?: (data: T) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

interface UseDataFetchReturn<T> {
  data: T | null;
  status: FetchStatus;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
  isRetrying: boolean;
  /** Refetch data (force bypasses cache) */
  refetch: (force?: boolean) => Promise<void>;
  /** Update data optimistically */
  setData: (data: T | ((prev: T | null) => T)) => void;
  /** Clear the cache for this key */
  invalidate: () => void;
}

export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseDataFetchOptions<T>
): UseDataFetchReturn<T> {
  const {
    cacheKey,
    cacheTTL = 30000, // 30 seconds default
    skip = false,
    initialData,
    onSuccess,
    onError,
  } = options;

  const { organization } = useOrganization();
  
  // Check cache on mount
  const cachedEntry = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
  const isCacheValid = cachedEntry && (Date.now() - cachedEntry.fetchedAt < cacheTTL);
  
  const [data, setDataState] = useState<T | null>(
    isCacheValid ? cachedEntry.data : (initialData ?? null)
  );
  const [status, setStatus] = useState<FetchStatus>(
    isCacheValid ? 'success' : 'idle'
  );
  const [error, setError] = useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const hasFetchedRef = useRef(isCacheValid);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async (force = false) => {
    if (skip) return;
    
    // Skip if we have valid cached data and not forcing
    if (!force && hasFetchedRef.current && status === 'success') {
      return;
    }
    
    // Check cache again (might have been populated by another component)
    if (!force) {
      const cached = dataCache.get(cacheKey) as CacheEntry<T> | undefined;
      if (cached && Date.now() - cached.fetchedAt < cacheTTL) {
        setDataState(cached.data);
        setStatus('success');
        hasFetchedRef.current = true;
        return;
      }
    }
    
    // Show loading only if we don't have data
    if (!data) {
      setStatus('loading');
    }
    setError(null);
    
    try {
      const result = await fetchFn();
      
      if (!mountedRef.current) return;
      
      // Update cache
      dataCache.set(cacheKey, {
        data: result,
        fetchedAt: Date.now(),
      });
      
      setDataState(result);
      setStatus('success');
      hasFetchedRef.current = true;
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [skip, status, data, cacheKey, cacheTTL, fetchFn, onSuccess, onError]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await refetch(true);
    } finally {
      if (mountedRef.current) {
        setIsRetrying(false);
      }
    }
  }, [refetch]);

  // Initial fetch
  useEffect(() => {
    if (!skip && organization?.id && !hasFetchedRef.current) {
      refetch();
    }
  }, [organization?.id, skip]);

  // Optimistic update
  const setData = useCallback((newData: T | ((prev: T | null) => T)) => {
    setDataState(prev => {
      const updated = typeof newData === 'function' 
        ? (newData as (prev: T | null) => T)(prev) 
        : newData;
      
      // Update cache with new data
      dataCache.set(cacheKey, {
        data: updated,
        fetchedAt: Date.now(),
      });
      
      return updated;
    });
    setStatus('success');
  }, [cacheKey]);

  // Invalidate cache
  const invalidate = useCallback(() => {
    dataCache.delete(cacheKey);
    hasFetchedRef.current = false;
  }, [cacheKey]);

  // Derived states
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
    isRetrying,
    refetch: handleRetry,
    setData,
    invalidate,
  };
}

/**
 * Utility to invalidate all cached data for an organization
 * Useful after major changes like org settings update
 */
export function invalidateOrgCache(orgId: string) {
  for (const key of dataCache.keys()) {
    if (key.includes(orgId)) {
      dataCache.delete(key);
    }
  }
}

/**
 * Utility to clear all cached data
 * Useful on logout
 */
export function clearDataCache() {
  dataCache.clear();
}
