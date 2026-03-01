
### লক্ষ্য
সকল পেইজ, মোডাল, ফর্মের লোডিং/স্লোনেস কমাতে **app-wide hard polish** করা হবে—শুধু একেকটা পেইজ না, বরং shared loading architecture + data-fetch pattern একসাথে স্ট্যাবিলাইজ করা হবে।

### অডিটে ধরা পড়া মূল bottleneck
1. **Permission fetching duplication (systemic)**  
   - `useOrgRolePermissions` বহু পেইজ/হুকে ব্যবহৃত হচ্ছে; একই permission টেবিল বারবার ফেচ হচ্ছে।
2. **Route-change এ forced permission refetch**  
   - `AppSidebar.tsx`-এ route change হলেই `refreshPermissions()` হচ্ছে।
3. **Global background fetch overhead**  
   - `NotificationManager.tsx` সব পেইজে mount হয়ে invoices/tasks/quotations checks চালাচ্ছে।
4. **Form/Detail pages-এ sequential fetch + full refetch pattern**  
   - edit/save/delete এর পর পুরো dataset refetch হচ্ছে।
5. **Still অনেক `select('*')`**  
   - payload বড় থাকায় list/detail/modal open ধীর হচ্ছে।
6. **একটি render anti-pattern**  
   - `Payments.tsx`-এ `useMemo(() => setCurrentPage(1))` side-effect হিসেবে ব্যবহার হয়েছে (এটা `useEffect` হওয়া উচিত)।
7. **Realtime over-fetch**  
   - `useTasks.ts`-এ realtime event পেলেই full refetch (employees+tasks) হচ্ছে।

---

### Implementation Plan (Hard Polish)

#### Phase 1 — Global loading pipeline stabilize (প্রথমে এটা)
- `src/components/layout/AppSidebar.tsx`  
  - route-change ভিত্তিক `refreshPermissions()` remove/limit করা (realtime + explicit refresh only)।
- `src/hooks/useOrgRolePermissions.ts`  
  - single-flight fetch + org-aware cache harden, duplicate fetch guard।
- `src/lib/permissions/hooks.ts` + `src/hooks/useSettingsTabPermissions.ts` + `src/hooks/useTasks.ts`  
  - repeated permission fetch path কমিয়ে centralized permission source align করা।
- `src/components/notifications/NotificationManager.tsx`  
  - startup checks org/user scoped করা, heavier checks defer + run conditions tighten করা।

#### Phase 2 — Page data-fetch architecture unify
High-traffic pages-এ full mount refetch থেকে cached query flow-এ আনা:
- `Dashboard.tsx`, `Customers.tsx`, `Invoices.tsx`, `Quotations.tsx`, `Expenses.tsx`, `Vendors.tsx`
- `Employees.tsx`, `Attendance.tsx`, `Leave.tsx`, `Salary.tsx`, `Performance.tsx`, `Tasks.tsx`
- `Reports.tsx`, `Payments.tsx`, `CustomerDetail.tsx`, `VendorDetail.tsx`
  
করণীয়:
- Query key standardize (`orgId`-scoped)
- staleTime/keepPreviousData apply
- filter/sort/pagination change এ full refetch না করে controlled fetch
- independent queries sequential না চালিয়ে `Promise.all`

#### Phase 3 — Modal/Form load optimization
- `InvoiceForm.tsx`, `VendorDetail` modals, `Expenses` modals, `Salary` dialogs, `TeamMembers` dialogs
- submit/delete/update এর পর “fetch full page” pattern কমিয়ে:
  - local optimistic patch
  - targeted invalidate/refetch
  - modal open সময় only required fields fetch

#### Phase 4 — Payload hardening (`SELECT *` cleanup pass)
Critical list/detail/form queries থেকে remaining wildcard select remove:
- `InvoiceForm.tsx` (invoice/invoice_items/costing read)
- `Leave.tsx` (`leave_balances`)
- `Salary.tsx` (`employee_advances`, `employee_salary_records` read points)
- `PriceCalculationForm.tsx`, `useNotifications.ts`, `useTasks.ts`, `useUpgradeRequests.ts`, `useApprovalRequests.ts`, অন্যান্য high-traffic hooks/components
- সব জায়গায় প্রয়োজনীয় minimal columns only

#### Phase 5 — Realtime + polling control
- `useTasks.ts`: full refetch-এর বদলে event-driven delta update (বা throttled refetch)
- Notifications/permission visibility refresh-এ debounce/throttle
- hidden tab/background অবস্থায় unnecessary fetch বন্ধ

#### Phase 6 — Validation & regression
- Route-to-route navigation timing (before/after)
- Modal open latency (create/edit flows)
- Form submit responsiveness
- Query count comparison (network waterfall)
- Mobile + desktop end-to-end smoke:
  - Dashboard → Invoices → InvoiceForm → Save
  - Vendors → VendorDetail → Add Bill/Payment
  - Employees/Attendance/Leave/Salary flows

---

### টেকনিক্যাল ডিটেইলস (সংক্ষিপ্ত)
- **Primary root-cause class:** duplicated permission/data fetch + global listeners/polling + over-wide payload  
- **Core strategy:** centralized cached reads + scoped invalidation + wildcard-select elimination + realtime throttling  
- **Expected outcome:**  
  - page transition এ query burst উল্লেখযোগ্যভাবে কমবে  
  - modal/form open দ্রুত হবে  
  - background network noise কমবে  
  - perceived loading spinner time কমে যাবে

---

### ডেলিভারি স্টাইল
আমি এটা **phased commit strategy** তে implement করব:
1) global blockers  
2) high-traffic pages  
3) modal/form polish  
4) wildcard cleanup + regression pass  
যাতে প্রতিটি phase শেষে app usable থাকে এবং regression isolate করা সহজ হয়।
