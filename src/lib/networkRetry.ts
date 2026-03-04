/**
 * Network retry utility for transient fetch failures.
 * Used by bootstrap contexts (Auth, Org, Permissions, CompanySettings)
 * to self-heal without manual page reload.
 */

const TRANSIENT_PATTERNS = [
  'failed to fetch',
  'load failed',
  'networkerror',
  'network request failed',
  'aborted',
  'timeout',
];

/** Check if an error is a transient network failure worth retrying */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return TRANSIENT_PATTERNS.some(p => msg.includes(p));
}

/** Check if an HTTP status is retryable */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

interface RetryOptions {
  /** Max number of retries (default 3) */
  maxRetries?: number;
  /** Initial delay in ms (default 1000) */
  baseDelay?: number;
  /** Max delay cap in ms (default 8000) */
  maxDelay?: number;
}

/**
 * Execute an async function with exponential backoff retry on transient failures.
 * 
 * Usage:
 * ```ts
 * const data = await withRetry(() => supabase.from('table').select('*'));
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 8000 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Only retry on transient network errors
      if (attempt < maxRetries && isTransientNetworkError(err)) {
        const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/**
 * Wrapper for Supabase queries that retries on transient network failures.
 * Checks both thrown errors and Supabase error objects in the response.
 * 
 * Usage:
 * ```ts
 * const { data, error } = await retrySupabaseQuery(() =>
 *   supabase.from('user_roles').select('role').eq('user_id', userId).single()
 * );
 * ```
 */
export async function retrySupabaseQuery<T extends { data: any; error: any }>(
  queryFn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 8000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();

      // If Supabase returned an error object, check if it's transient
      if (result.error && attempt < maxRetries) {
        const msg = result.error.message || '';
        if (isTransientNetworkError(msg)) {
          const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }

      return result;
    } catch (err) {
      if (attempt < maxRetries && isTransientNetworkError(err)) {
        const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  // Should not reach here, but TypeScript needs it
  return queryFn();
}
