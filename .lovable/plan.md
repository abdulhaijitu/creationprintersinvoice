

## Employees, Attendance, Salary, Leave, Performance, Tasks — সমস্যা ও উন্নতি বিশ্লেষণ

---

### ১. Employees পেইজ (`src/pages/Employees.tsx` — 1008 লাইন)

**ত্রুটি:**
- **Pagination নেই** — সব employee একসাথে লোড, 1000 row limit
- **Mobile card view নেই** — ডেস্কটপ টেবিল `min-w-[800px]` দিয়ে মোবাইলে horizontal scroll — অন্য পেইজে mobile card view আছে
- **Stats card নেই** — Total employees, average salary ইত্যাদি কোনো summary নেই; অন্য সব পেইজে আছে
- **Cancel বাটন ভুল দিকে call করে** — লাইন 691: `handleAddDialogClose(true)` — `true` মানে dialog open হবে, close না; cancel ক্লিক করলে dialog আবার open হয়ে যাবে

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- Mobile card view যোগ (Avatar, name, designation, salary সহ)
- Stats cards যোগ (Total Employees, Average Salary, Total Salary Cost)
- Cancel button fix: `handleAddDialogClose(true)` → `closeAddDialog()`

---

### ২. Attendance পেইজ (`src/pages/Attendance.tsx` — 809 লাইন)

**ত্রুটি:**
- **বড় কোনো ত্রুটি নেই** — এই পেইজ ইতিমধ্যে ভালো optimized: tabs (Daily/Monthly/Bulk Entry), mobile cards, stats, badge counters সব আছে

**ছোট উন্নতি:**
- Unused import `Dialog, DialogTrigger` ব্যবহার হচ্ছে কিনা verify (DialogTrigger used at line ~470)
- No issues found that warrant changes in this scope

---

### ৩. Salary পেইজ (`src/pages/Salary.tsx` — 1969 লাইন)

**ত্রুটি:**
- **Local `formatCurrency` function** (লাইন 1014-1021) — `@/lib/formatters`-এ shared function আছে, কিন্তু এখানে নিজস্ব function। Inconsistent
- **Pagination নেই** — Salary ও Advances উভয় ট্যাবে সব রেকর্ড একসাথে লোড
- **`isAdmin` permission check inconsistent** — কিছু জায়গায় `isAdmin` (লাইন 1111, 1543), কিছু জায়গায় `canCreateSalary`/`canEditSalary` — mixed usage
- **ShieldAlert import আছে কিন্তু unused** — লাইন 33-এ import, শুধু access denied section-এ ব্যবহার হয় (used actually)

**উন্নতি:**
- Local `formatCurrency` সরিয়ে shared import ব্যবহার
- Salary ট্যাবে pagination যোগ (PAGE_SIZE = 25)
- `isAdmin` → `canCreateSalary` / `canEditSalary` consistent করা

---

### ৪. Leave পেইজ (`src/pages/Leave.tsx` — 608 লাইন)

**ত্রুটি:**
- **`handleDelete` browser `confirm()` ব্যবহার করে** (লাইন 332) — inconsistent with ConfirmDialog pattern
- **Pagination নেই** — সব leave request একসাথে লোড
- **N+1 query** — প্রতিটি leave request-এর জন্য আলাদা profile query (লাইন 135-144) — 50 requests = 50 extra queries
- **Mobile responsive নয়** — `min-w-[700px]` ব্যবহার, মোবাইলে horizontal scroll
- **Permission check `isAdmin` ব্যবহার করে** — database-driven permission (`hasPermission`) ব্যবহার হচ্ছে না; অন্য পেইজে হচ্ছে

**উন্নতি:**
- `confirm()` → `ConfirmDialog` component
- Pagination যোগ (PAGE_SIZE = 25)
- Mobile card view যোগ
- `isAdmin` → `hasPermission('leave.view')` / `hasPermission('leave.manage')` consistent করা

---

### ৫. Performance পেইজ (`src/pages/Performance.tsx` — 397 লাইন)

**ত্রুটি:**
- **`handleDelete` browser `confirm()` ব্যবহার করে** (লাইন 156) — inconsistent
- **Pagination নেই** — সব notes একসাথে লোড
- **Mobile responsive নয়** — শুধু টেবিল, mobile card view নেই
- **Permission check `isAdmin` ব্যবহার করে** — database-driven permission নেই
- **Edit functionality নেই** — শুধু Add ও Delete আছে, Edit নেই

**উন্নতি:**
- `confirm()` → `ConfirmDialog` component
- Pagination যোগ (PAGE_SIZE = 25)
- `isAdmin` → `hasPermission('performance.view')` / `hasPermission('performance.manage')` consistent করা

---

### ৬. Tasks পেইজ (`src/pages/Tasks.tsx` — 758 লাইন)

**ত্রুটি:**
- **বড় কোনো ত্রুটি নেই** — Permission system, Kanban, Hierarchy, mobile responsive, ConfirmDialog সব আছে
- **Pagination নেই** — List view-তে সব task একসাথে দেখায়

**উন্নতি:**
- List view-তে pagination যোগ (PAGE_SIZE = 25) — Kanban ও Hierarchy view-তে pagination লাগবে না

---

### Implementation Plan

#### ফাইল ১: `src/pages/Employees.tsx`
- Stats cards যোগ (Total Employees, Avg Salary, Total Salary)
- `currentPage` state + PAGE_SIZE = 25 + pagination controls
- Mobile card view যোগ (`md:hidden` block — avatar, name, designation, salary, edit/delete buttons)
- Cancel button fix: লাইন 691 `handleAddDialogClose(true)` → `closeAddDialog()`

#### ফাইল ২: `src/pages/Salary.tsx`
- Local `formatCurrency` সরিয়ে `import { formatCurrency } from '@/lib/formatters'` ব্যবহার
- Salary tab-এ pagination যোগ (PAGE_SIZE = 25)
- Permission consistency: `isAdmin` → `canEditSalary` / `canCreateSalary`

#### ফাইল ৩: `src/pages/Leave.tsx`
- `confirm()` → `ConfirmDialog` component + `deleteId` state
- Pagination যোগ (PAGE_SIZE = 25)
- Mobile card view যোগ

#### ফাইল ৪: `src/pages/Performance.tsx`
- `confirm()` → `ConfirmDialog` component + `deleteId` state
- Pagination যোগ (PAGE_SIZE = 25)

#### ফাইল ৫: `src/pages/Tasks.tsx`
- List view-তে pagination যোগ (PAGE_SIZE = 25)

**Attendance পেইজে কোনো পরিবর্তন লাগবে না** — ইতিমধ্যে optimized

