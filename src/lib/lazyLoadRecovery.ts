/**
 * Centralized lazy-load recovery utility.
 *
 * Handles stale HMR / deployment cache errors that produce
 * "Failed to fetch dynamically imported module" or similar TypeError.
 *
 * Strategy: fast-fail with bounded auto-reload budget per session.
 * - Max 3 auto-reloads per session (prevents infinite loops).
 * - Successful page load clears the budget.
 * - After budget exhausted, ChunkLoadBoundary shows manual retry UI.
 */

const RELOAD_COUNT_KEY = 'chunkReloadCount';
const RELOAD_TS_KEY = 'chunkReloadTs';
const MAX_AUTO_RELOADS = 3;
const RELOAD_WINDOW_MS = 60_000; // reset counter after 60s of stability

/** Detect dynamic-import / chunk-load errors reliably */
export function isDynamicImportError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('failed to load module script') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk')
  );
}

/** Get current reload count within the active window */
function getReloadBudget(): { count: number; withinWindow: boolean } {
  const count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0');
  const lastTs = Number(sessionStorage.getItem(RELOAD_TS_KEY) || '0');
  const withinWindow = Date.now() - lastTs < RELOAD_WINDOW_MS;
  return { count: withinWindow ? count : 0, withinWindow };
}

/** Guarded page reload — uses a session budget to prevent infinite loops */
export function guardedReload(): void {
  const { count } = getReloadBudget();

  if (count >= MAX_AUTO_RELOADS) {
    // Budget exhausted — let error boundary show UI
    return;
  }

  sessionStorage.setItem(RELOAD_COUNT_KEY, String(count + 1));
  sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
  window.location.reload();
}

/** Clear the reload budget — call on successful app boot / lazy load */
export function clearReloadGuard(): void {
  sessionStorage.removeItem(RELOAD_COUNT_KEY);
  sessionStorage.removeItem(RELOAD_TS_KEY);
}

/**
 * Wrap a dynamic import with one fast retry, then guarded reload as fallback.
 * Keeps retry minimal — browser-side retries of chunk URLs are unreliable,
 * so we prefer a fast hard-reload instead.
 */
export function lazyRetry(
  importFn: () => Promise<any>,
): Promise<any> {
  return importFn()
    .then((mod) => {
      clearReloadGuard();
      return mod;
    })
    .catch((err) => {
      if (isDynamicImportError(err)) {
        // One fast retry (no delay) — handles transient glitches
        return importFn()
          .then((mod) => {
            clearReloadGuard();
            return mod;
          })
          .catch((retryErr) => {
            if (isDynamicImportError(retryErr)) {
              guardedReload();
            }
            throw retryErr;
          });
      }
      throw err;
    });
}
