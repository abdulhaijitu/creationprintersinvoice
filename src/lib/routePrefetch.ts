const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Dashboard'),
  '/invoices': () => import('@/pages/Invoices'),
  '/payments': () => import('@/pages/Payments'),
  '/quotations': () => import('@/pages/Quotations'),
  '/price-calculation': () => import('@/pages/PriceCalculations'),
  '/delivery-challans': () => import('@/pages/DeliveryChallans'),
  '/customers': () => import('@/pages/Customers'),
  '/vendors': () => import('@/pages/Vendors'),
  '/expenses': () => import('@/pages/Expenses'),
  '/employees': () => import('@/pages/Employees'),
  '/attendance': () => import('@/pages/Attendance'),
  '/salary': () => import('@/pages/Salary'),
  '/leave': () => import('@/pages/Leave'),
  '/performance': () => import('@/pages/Performance'),
  '/tasks': () => import('@/pages/Tasks'),
  '/reports': () => import('@/pages/Reports'),
  '/team-members': () => import('@/pages/TeamMembers'),
  '/settings': () => import('@/pages/Settings'),
};

const prefetched = new Set<string>();
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Prefetch a route's JS chunk on hover-intent (150ms debounce).
 * Failures are silently swallowed so the Set stays clean for retry.
 */
export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;

  // Cancel any pending prefetch from a previous hover
  if (hoverTimer) clearTimeout(hoverTimer);

  hoverTimer = setTimeout(() => {
    const importFn = routeImportMap[path];
    if (importFn) {
      prefetched.add(path);
      importFn().catch(() => {
        // Remove so next hover can retry — don't poison cache
        prefetched.delete(path);
      });
    }
  }, 150);
}

/** Cancel pending prefetch (call on mouseleave) */
export function cancelPrefetch() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}
