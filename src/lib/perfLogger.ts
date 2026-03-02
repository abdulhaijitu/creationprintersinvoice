/**
 * Performance logging utility for development
 * Logs slow fetches (>1.5s) to help identify bottlenecks
 */

const SLOW_THRESHOLD_MS = 1500;

/**
 * Wraps an async function to log execution time warnings in development
 */
export async function timedFetch<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  if (import.meta.env.PROD) return fn();

  const start = performance.now();
  try {
    const result = await fn();
    const elapsed = performance.now() - start;
    if (elapsed > SLOW_THRESHOLD_MS) {
      console.warn(
        `⚠️ Slow fetch [${label}]: ${elapsed.toFixed(0)}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`
      );
    }
    return result;
  } catch (error) {
    const elapsed = performance.now() - start;
    console.warn(`❌ Failed fetch [${label}]: ${elapsed.toFixed(0)}ms`, error);
    throw error;
  }
}
