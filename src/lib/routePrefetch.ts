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

export function prefetchRoute(path: string) {
  if (prefetched.has(path)) return;
  const importFn = routeImportMap[path];
  if (importFn) {
    prefetched.add(path);
    importFn().catch(() => {
      // Remove from set so it can retry next hover
      prefetched.delete(path);
    });
  }
}
