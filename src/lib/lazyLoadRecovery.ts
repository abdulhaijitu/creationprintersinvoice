/**
 * Centralized lazy-load recovery utility.
 *
 * Handles stale HMR / deployment cache errors that produce
 * "Failed to fetch dynamically imported module" or similar TypeError.
 *
 * Features:
 * - isDynamicImportError() detector
 * - retry with exponential back-off
 * - guarded hard-reload with timestamp-based cooldown (prevents infinite loops)
 * - clears reload guard on successful load
 */

const RELOAD_KEY = 'chunkReloadTs';
const RELOAD_COOLDOWN_MS = 10_000; // min 10 s between auto-reloads

/** Detect dynamic-import / chunk-load errors reliably */
export function isDynamicImportError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  );
}

/** Guarded page reload — won't loop faster than RELOAD_COOLDOWN_MS */
export function guardedReload(): void {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  if (now - last < RELOAD_COOLDOWN_MS) {
    // Too recent — don't reload again; let error boundary show UI.
    return;
  }
  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
}

/** Clear the reload guard — call on any successful lazy load */
export function clearReloadGuard(): void {
  sessionStorage.removeItem(RELOAD_KEY);
}

/**
 * Retry a dynamic import with back-off, then optionally trigger a guarded
 * hard-reload as a last resort.
 *
 * @param importFn  () => import('./SomePage')
 * @param retries   number of retries before giving up (default 2)
 */
export function lazyRetry(
  importFn: () => Promise<any>,
  retries = 2,
): Promise<any> {
  return importFn()
    .then((mod) => {
      // Success — clear any previous reload guard
      clearReloadGuard();
      return mod;
    })
    .catch((err) => {
      if (retries > 0 && isDynamicImportError(err)) {
        const delay = (3 - retries) * 500; // 500, 1000
        return new Promise((r) => setTimeout(r, delay)).then(() =>
          lazyRetry(importFn, retries - 1),
        );
      }

      // All retries exhausted — attempt guarded reload for chunk errors
      if (isDynamicImportError(err)) {
        guardedReload();
      }

      throw err;
    });
}
