
সমস্যা নির্ণয়
- Do I know what the issue is? হ্যাঁ।
- দুইটা root cause একসাথে হচ্ছে:
  1) Dynamic import recovery flow-এ বর্তমান retry + reload guard behavior সবসময় দ্রুত recover করতে পারছে না।
  2) Core bootstrap API callগুলো (role/org/permissions/settings/notifications) intermittently `Failed to fetch` হলে retry না থাকায় app state ভেঙে যায়, পরে reload দিলে ঠিক হয়।

প্রমাণ
- `lazyLoadRecovery.ts` এখনো retry delay চালায়, কিন্তু Vite guideline অনুযায়ী dynamic import failure browser-side retry সাধারণত reliable না।
- সাম্প্রতিক runtime network snapshot-এ critical startup calls-এ ধারাবাহিক `Failed to fetch` (user_roles, organization_members, org_role_permissions, company_settings, notifications) দেখা গেছে।

Implementation Plan
1) Dynamic import recovery simplify + harden
- `src/lib/lazyLoadRecovery.ts`
  - retry loop কমিয়ে fast-fail recovery model (bounded auto reload)।
  - reload guard কে session-based attempt budgetে আনবো (infinite loop না, blockও না)।
  - successful boot/lazy load-এ guard reset নিশ্চিত করবো।

2) Global load error handling stabilize
- `src/main.tsx`
  - `vite:preloadError` listener idempotent করা (duplicate register guard)।
  - dynamic-import error detection object/string-safe করা।
  - non-dynamic unhandled rejection শুধু log করা, reload trigger না করা।

3) Prefetch কে dev-safe করা
- `src/lib/routePrefetch.ts`
  - preview/dev mode-এ prefetch disable বা strict throttle।
  - hover timer cleanup improve (pending কাজ বাতিল)।
- `src/components/layout/AppSidebar.tsx`
  - prefetch call env-gated করা।
  - `onMouseLeave`-এ cancel hook যুক্ত করা।

4) Critical bootstrap fetch-এ network retry যোগ
- নতুন helper: `src/lib/networkRetry.ts`
  - transient network failure (`Failed to fetch`, timeout, 429/5xx) হলে backoff retry।
- Apply in:
  - `src/contexts/AuthContext.tsx` (role fetch)
  - `src/contexts/OrganizationContext.tsx` (membership + org fetch)
  - `src/contexts/PermissionContext.tsx` (permission fetch)
  - `src/contexts/CompanySettingsContext.tsx` (settings fetch)

5) Error fallback UX refine
- `src/components/errors/ChunkLoadBoundary.tsx`
  - Retry behavior বাস্তবসম্মত করা (soft retry + hard reload path)।
  - network-instability hint যোগ করা।

Validation Checklist
- Desktop + mobile route sweep: `/invoices`, `/payments`, `/customers`, `/vendors`, `/reports`, `/settings`, `/admin`।
- Simulated intermittent network test: reload ছাড়া recovery verify।
- Console লক্ষ্য:
  - recurring dynamic-import blank screen বন্ধ
  - startup fetch failure হলে auto-retry success
- Regression check:
  - sidebar navigation speed degrade না হওয়া
  - production prefetch intact থাকা

Technical Snapshot
```text
Before:
Route import fail -> retry delay -> guard block -> manual reload needed

After:
Route import fail -> bounded auto-recover
+
Bootstrap API transient fail -> auto-retry -> state self-heals without manual reload
```
