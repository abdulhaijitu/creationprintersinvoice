

## Massive Performance Optimization Plan

### Current State Analysis

The codebase already has several optimizations in place:
- Route-level code splitting with `React.lazy()`
- Dashboard uses `useQuery` with `Promise.all` for parallel fetches
- `useOrgRolePermissions` has single-flight dedup and caching
- Skeleton loading states exist
- `NotificationManager` defers startup checks (5s/8s delays)
- Specific column selects on most queries

However, significant bottlenecks remain across pages, contexts, and realtime subscriptions.

---

### Phase 1: Context & Auth Pipeline (3 files)

**`src/contexts/OrganizationContext.tsx`**
- Line 86-88: `organization_members` query uses `select('*')` — change to `select('id, organization_id, user_id, role')`
- Line 106-109: `organizations` query uses `select('*')` — select only needed columns
- Line 176-178: `fetchOrganization(true)` on mount forces refetch every time — remove `true`, let cache guard handle it

**`src/contexts/CompanySettingsContext.tsx`**  
- Line 51-54: `select('*')` on `company_settings` — select specific columns only
- Line 48: `setLoading(true)` on every fetch causes flash — only set loading if no existing data

**`src/contexts/PermissionContext.tsx`**
- Line 392-402: Visibility change listener refetches on EVERY tab focus — add a cooldown (e.g., skip if fetched < 60s ago)

### Phase 2: High-Traffic Page Optimization (6 files)

**`src/pages/Invoices.tsx`**
- Line 124-128: Raw `useEffect` + manual `fetchInvoices` — convert to `useQuery` with `queryKeys.invoices(orgId)` and `staleTime`
- This eliminates redundant fetches on route revisits

**`src/pages/Customers.tsx`**
- Line 132-136: Same pattern — convert to `useQuery` with proper cache key
- Line 138-176: `fetchCustomers` does TWO sequential queries (customers + invoices) — use `Promise.all`

**`src/pages/Quotations.tsx`, `Expenses.tsx`, `Vendors.tsx`, `Employees.tsx`**
- Same conversion: raw `useEffect`+`fetch` → `useQuery` with org-scoped keys and `staleTime`

### Phase 3: NotificationManager Background Optimization (1 file)

**`src/components/notifications/NotificationManager.tsx`**
- Line 96-143: Invoice reminder check fetches ALL unpaid invoices without org filter or limit — add `organization_id` filter and `limit(50)`
- Line 146-194: Task deadline check fetches ALL non-completed tasks without org filter — add org filter and `limit(50)`
- Line 100-104: `select('id, invoice_number, due_date, total, status, customers(name)')` is fine but needs `.eq('organization_id', organization.id)`

### Phase 4: Realtime Subscription Cleanup (2 files)

**`src/contexts/CompanySettingsContext.tsx`**
- Line 107-131: Realtime channel subscribes globally without org filter — not critical but wasteful

**`src/contexts/PermissionContext.tsx`**
- Already properly scoped; add timestamp guard to visibility handler

### Phase 5: useTasks Optimization (1 file)

**`src/hooks/useTasks.ts`**
- Line 72-162: `fetchTasks` does sequential `employees` then `tasks` queries — use `Promise.all`
- Line 128-153: Client-side employee matching per task is O(n*m) — convert to Map lookup

### Phase 6: React Memoization (2 files)

**`src/pages/Dashboard.tsx`**
- `MetricColumn` component (line 285) — wrap with `React.memo` (already pure)

**`src/components/layout/AppLayout.tsx`**  
- `AuthLoadingShell` and `PageLoadingFallback` — these are already stable, minimal impact

### Phase 7: Query Config Hardening (1 file)

**`src/hooks/useQueryConfig.ts`**
- Line 37: `refetchOnMount: false` — this is already set, good
- Verify `placeholderData` doesn't cause type issues with strict mode

---

### Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| OrganizationContext | Select specific columns, remove force refresh on mount | Reduces payload, stops redundant fetch |
| CompanySettingsContext | Select specific columns, conditional loading state | Eliminates flash, reduces payload |
| PermissionContext | Add cooldown to visibility handler | Prevents tab-focus spam |
| Invoices.tsx | Convert to useQuery | Cached navigation, no re-fetch |
| Customers.tsx | Convert to useQuery + Promise.all | Parallel fetch, cached |
| NotificationManager | Add org filter + limits | Prevents global table scans |
| useTasks.ts | Promise.all + Map lookup | Faster task loading |
| Dashboard.tsx | React.memo on MetricColumn | Minor re-render savings |

Total files modified: ~10. No UI changes. No breaking changes.

