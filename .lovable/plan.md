

## সাইডবার আইটেম — ত্রুটি ও উন্নতি

### ত্রুটিসমূহ (Bugs)

**1. Calendar ও Tasks একই permissionKey ব্যবহার করছে**
`sidebarConfig.ts` এ Calendar (`/calendar`) এবং Tasks (`/tasks`) দুটোই `hr.tasks` permissionKey ব্যবহার করছে। Calendar-এর নিজস্ব permission key থাকা উচিত, অথবা যেহেতু Calendar আসলে Tasks-এরই একটি ভিউ, তাই এটি ঠিক আছে — তবে Calendar-কে আলাদা আইটেম না রেখে Tasks পেইজের ভিতরে ট্যাব/ভিউ হিসেবে রাখা বেটার।

**2. `price_calculation` route mismatch**
`PermissionContext.tsx` এ `MODULE_ROUTES`-এ `price_calculation: '/price-calculations'` (plural, with 's') আছে, কিন্তু আসল route হলো `/price-calculation` (singular, without 's')। এটি redirect logic-এ ভুল path-এ পাঠাবে।

**3. `team` route mismatch**
`MODULE_ROUTES`-এ `team: '/team'` আছে, কিন্তু আসল route হলো `/team-members`।

**4. HR & Ops group category mismatch**
`sidebarNavGroups`-এ HR & Ops group-এর category `'hr_ops'` দেওয়া আছে, কিন্তু সব HR item-এর permissionKey prefix `'hr.'` — category ও prefix অসামঞ্জস্যপূর্ণ (minor, কিন্তু confusion তৈরি করতে পারে)।

**5. MobileBottomNav legacy permission system ব্যবহার করছে**
`MobileBottomNav.tsx` এ `hasPermission(role, ...)` (legacy role-based) ব্যবহার হচ্ছে, কিন্তু বাকি সব জায়গায় `usePermissionContext()` (module-based) ব্যবহার হচ্ছে। Quick actions-এ wrong permissions check হবে।

**6. `AttendanceCorrectionRequests` পেইজের route সাইডবারে নেই**
`App.tsx`-এ এই route নেই, এবং সাইডবারেও নেই — তবে পেইজ ফাইল আছে। Orphan পেইজ।

### উন্নতির সুযোগ

**7. Customers ও Employees একই আইকন (Users)**
`businessNavItems`-এ Customers এবং `hrNavItems`-এ Employees দুটোই `Users` আইকন ব্যবহার করছে। Collapsed সাইডবারে বিভ্রান্তিকর। Customers-এ `Contact` বা `UserRound` ব্যবহার করা উচিত।

**8. Calendar আইটেম রিমুভ করা**
Calendar আলাদা সাইডবার আইটেম না রেখে Tasks পেইজের ভিতরে Calendar view ট্যাব হিসেবে রাখা উচিত — কারণ একই ডেটা, একই permission।

### পরিবর্তনসমূহ

#### ফাইল ১: `src/lib/permissions/sidebarConfig.ts`
- Customers আইকন `Users` → `UserRound` (বা `Contact`) পরিবর্তন
- Calendar আইটেম রিমুভ (Tasks পেইজে ট্যাব হিসেবে থাকবে)
- Import আপডেট

#### ফাইল ২: `src/contexts/PermissionContext.tsx`
- `price_calculation: '/price-calculations'` → `'/price-calculation'` ফিক্স
- `team: '/team'` → `'/team-members'` ফিক্স

#### ফাইল ৩: `src/components/layout/MobileBottomNav.tsx`
- `hasPermission(role, ...)` legacy system → `usePermissionContext()` module-based system-এ আপডেট
- `import { hasPermission } from '@/lib/permissions'` রিমুভ

