
সমস্যার অবস্থা (আমি যা পেলাম)
- Error pattern একই: `Failed to fetch dynamically imported module` → blank screen → manual reload দিলে ঠিক।
- `App.tsx`-এ current `lazyRetry` আছে, কিন্তু `lazyRetryReload` guard **set হয়, clear হয় না**। ফলে session-এ একবার auto-reload হওয়ার পর পরের import failure-গুলোতে আর auto-recover হয় না।
- `src/lib/routePrefetch.ts` prefetch করছে, কিন্তু এটা main lazy-recovery flow-এর সাথে unified না; তাই prefetch/import failure handling fragmented।
- Vite docs অনুযায়ী (`vite:preloadError`) global handler রাখা উচিত chunk/preload failure recovery-এর জন্য।

Do I know what the issue is? হ্যাঁ।

মূল কারণ (সংক্ষেপে)
1) Stale dynamic-import URL (HMR/deploy cache skew)  
2) Reload guard lifecycle অসম্পূর্ণ (set-only, reset নেই)  
3) Prefetch path ও lazy route loading recovery এক জায়গায় না  
4) Global preload/chunk error boundary নেই, তাই white screen

Implementation plan (all pages audit + fix)
1. Centralized lazy-load recovery utility বানানো
   - নতুন utility: `src/lib/lazyLoadRecovery.ts`
   - থাকবে:
     - `isDynamicImportError(error)` detector
     - retry with backoff
     - guarded hard reload (`sessionStorage` with timestamp-based cooldown)
     - success হলে reload guard clear
   - Goal: সব lazy import-এর জন্য একটাই reliable behavior।

2. `App.tsx` harden করা (সব route-level lazy page)
   - বর্তমান inline `lazyRetry` বাদ দিয়ে centralized helper ব্যবহার।
   - সব `lazy(() => import(...))` path unified recovery stack-এ আনা।
   - Loader fail হলে infinite reload loop ছাড়া deterministic recover নিশ্চিত করা।

3. Global Vite preload error handling যোগ করা
   - `src/main.tsx`-এ:
     - `window.addEventListener('vite:preloadError', ...)`
     - `event.preventDefault()` + guarded `window.location.reload()`
   - এতে React.lazy-এর বাইরের preload/chunk mismatch-ও recover হবে।

4. Route prefetch system safe করা
   - `src/lib/routePrefetch.ts` refactor:
     - prefetchকে same loader registry/recovery logic-এর সাথে align করা
     - hover-intent debounce (accidental mass prefetch কমাতে)
     - dev/HMR mode-এ aggressive prefetch disable বা throttle
     - failure হলে silent retryযোগ্য state রাখা (poisoned cache না)
   - `src/components/layout/AppSidebar.tsx`-এ event wiring update (hover intent + cancel on leave)।

5. Nested lazy imports audit (non-route heavy sections)
   - `src/pages/Admin.tsx`-এর internal lazy components একই recovery helper-এ migrate করা।
   - যাতে “all pages” scope-এ admin sub-sections-ও covered থাকে।

6. Graceful fallback UI (blank screen prevention)
   - নতুন component: `src/components/errors/ChunkLoadBoundary.tsx`
   - chunk/load failure detect হলে full blank না দেখিয়ে:
     - “Retry”
     - “Reload app”
   - App root route tree-কে এই boundary-তে wrap করা।

Validation checklist (fix complete criteria)
- Desktop: sidebar থেকে সব primary route ১ বার করে open (Invoices, Payments, Customers, ...), manual reload ছাড়া।
- Repeat navigation after code hot-update simulation: stale module error এলে auto recover হচ্ছে কিনা।
- Mobile navigation (bottom nav + mobile tiles) route switching test।
- Admin page sections lazy-load test।
- Console-এ uncaught dynamic import error/blank screen zero tolerance।
- First-load UX regression check (prefetch changes এ over-fetching না হয়)।

Risk control
- Reload cooldown রাখব যাতে loop না হয়।
- Recovery শুধু dynamic-import/chunk errors-এ apply হবে; API/data errors-এর সাথে mix হবে না।
- Existing business data/auth flow untouched (no backend schema change needed)।
