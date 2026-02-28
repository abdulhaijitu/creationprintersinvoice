

## Reports, Team Members, Settings — সমস্যা ও উন্নতি বিশ্লেষণ

---

### ১. Reports পেইজ (`src/pages/Reports.tsx` — 1482 লাইন)

**ত্রুটি:**
- **দুইটি Access Denied চেক আছে — contradictory** — লাইন 270 `hasReportAccess` (permission-based) চেক করে, কিন্তু লাইন 700 আবার `!isAdmin` চেক করে। দ্বিতীয় চেকটি permission-based system-কে override করে — non-admin user যে `reports.view` permission পেয়েছে সেও "Access Denied" দেখবে
- **Local `formatCurrency` function** (লাইন 556) — `@/lib/formatters`-এ shared function আছে কিন্তু ব্যবহার হচ্ছে না; inconsistent
- **Invoice table-এ pagination নেই** — Invoices tab-এ সব invoice একসাথে দেখায়, 100+ invoice হলে scroll সমস্যা
- **Salary query filter ভুল** — লাইন 353: শুধু `year` filter করে কিন্তু `month` filter SQL level-এ নেই — সব year-এর salary fetch করে JS-এ filter করে (লাইন 388-395), অপ্রয়োজনীয় data fetch হয়
- **Hardcoded color values** — লাইন 169, 170-এ `text-emerald-600`, `text-rose-600` ইত্যাদি ব্যবহার হচ্ছে; semantic token ব্যবহার করা উচিত (কিন্তু report chart context-এ acceptable)

**উন্নতি:**
- দ্বিতীয় `!isAdmin` access denied block (লাইন 700-725) সরানো — `hasReportAccess` (লাইন 270) ই যথেষ্ট
- Local `formatCurrency` সরিয়ে shared import ব্যবহার
- Invoice tab-এ pagination যোগ (PAGE_SIZE = 25)

---

### ২. Team Members পেইজ (`src/pages/TeamMembers.tsx` — 1232 লাইন)

**ত্রুটি:**
- **বড় কোনো ত্রুটি নেই** — এই পেইজ ভালো optimized: mobile card view, desktop table, invite flow, edit/delete dialogs, permissions tab, module-level caching সব আছে
- **`userLimit` hardcoded 20** (লাইন 789) — কিন্তু কোথাও plan-based limit check নেই, শুধু UI-তে disable হয়; ডাটাবেসে কোনো enforcement নেই

**ছোট উন্নতি:**
- `userLimit` কে organization plan থেকে dynamic করা যায় (কিন্তু plan system এই scope-এ নেই)
- কোনো critical fix প্রয়োজন নেই

---

### ৩. Settings পেইজ (`src/pages/Settings.tsx` — 860 লাইন)

**ত্রুটি:**
- **বড় কোনো ত্রুটি নেই** — Granular tab permissions, unsaved changes warning, sticky save footer, read-only mode, rich text editor — সব ভালোভাবে implement করা আছে
- **Logo upload-এ file size validation নেই** — Description বলে "max 2MB" (লাইন 566) কিন্তু কোনো validation নেই — 10MB ফাইলও upload হবে
- **Invoice Number Settings ও Quotation Number Settings component import আছে** কিন্তু ব্যবহার হচ্ছে না (ফাইল লিস্টে আছে কিন্তু Settings.tsx-এ import নেই — এগুলো আলাদা component)

**উন্নতি:**
- Logo upload-এ file size validation যোগ (max 2MB check)
- সামগ্রিকভাবে Settings পেইজ ভালো অবস্থায় আছে

---

### Implementation Plan

#### ফাইল ১: `src/pages/Reports.tsx`
- দ্বিতীয় `!isAdmin` access denied block (লাইন 700-725) সম্পূর্ণ সরানো — `hasReportAccess` check ই যথেষ্ট
- Local `formatCurrency` (লাইন 556-558) সরিয়ে `import { formatCurrency } from '@/lib/formatters'` ব্যবহার
- Invoice tab-এ pagination যোগ (`currentPage` state + PAGE_SIZE = 25 + pagination controls)

#### ফাইল ২: `src/pages/Settings.tsx`
- Logo upload-এ file size validation (2MB limit) যোগ — toast error দেখানো যদি file > 2MB হয়

**Team Members পেইজে কোনো পরিবর্তন লাগবে না** — ইতিমধ্যে optimized

