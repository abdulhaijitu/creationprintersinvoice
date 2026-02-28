

## Customers, Vendors, Expenses — সমস্যা ও উন্নতি বিশ্লেষণ

---

### ১. Customers পেইজ (`src/pages/Customers.tsx`)

**ত্রুটি:**
- **Pagination নেই** — 1108 লাইনের পেইজে সব customer একসাথে লোড হয়, 1000 row limit hit করবে
- **`handleDelete` আসল hard delete করে** (লাইন 228) — `supabase.from('customers').delete()` ব্যবহার করে, কিন্তু `fetchCustomers`-এ `is_deleted: false` ফিল্টার আছে (লাইন 144)। তাহলে soft-delete সাপোর্ট আছে কিন্তু single delete-এ ব্যবহার হচ্ছে না। Bulk delete edge function-এ soft-delete (archive) করে, কিন্তু single delete hard delete করে — inconsistent
- **Desktop Action column-এ redundant বাটন** — View, Edit, Delete আলাদা আলাদা icon button + MoreHorizontal dropdown-এ আবার একই View, Edit, Delete (লাইন 944-1021)। দুবার একই action দেখাচ্ছে
- **Delete permission check inconsistent** — Desktop-এ `isAdmin` চেক করে (লাইন 973), কিন্তু `canBulkDelete` তে `canRolePerform(orgRole, 'customers', 'delete')` ব্যবহার করে (লাইন 114)। একটায় isAdmin, অন্যটায় role-based — inconsistent
- **`formatCurrency` local function** — `src/lib/formatters.ts`-এ shared `formatCurrency` আছে, কিন্তু এখানে নিজস্ব function (লাইন 370)। Inconsistent formatting

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- Single delete-কে soft-delete করা (`is_deleted: true` update) — bulk delete-এর সাথে consistent
- Redundant action buttons সরানো — শুধু DropdownMenu রাখা
- Delete permission `isAdmin` → role-based `canRolePerform` দিয়ে consistent করা
- Local `formatCurrency` → shared `formatCurrency` from `@/lib/formatters` ব্যবহার

---

### ২. Vendors পেইজ (`src/pages/Vendors.tsx`)

**ত্রুটি:**
- **Pagination নেই** — সব vendor একসাথে লোড, 1000 row limit
- **Sorting নেই** — টেবিল হেডারে SortableTableHeader ব্যবহার হয়নি
- **`handleDelete` browser `confirm()` ব্যবহার করে** (লাইন 206) — বাকি সব পেইজে `ConfirmDialog` component ব্যবহার হয়; এখানে native `confirm()` — inconsistent UX
- **Cascade delete unsafe** — Vendor delete করলে সব bills ও payments চুপচাপ মুছে যায় (লাইন 209-213), কোনো warning summary নেই
- **N+1 query সমস্যা** — `fetchVendors`-এ প্রতিটি vendor-এর জন্য আলাদা bills ও payments query (লাইন 105-134) — 50 vendor = 100 extra queries
- **`formatCurrency` local function** — shared function ব্যবহার হচ্ছে না
- **Stats card "Total Paid" নেই** — Total Vendors, Total Bills, Total Due আছে কিন্তু Total Paid নেই
- **Import duplicate check org-scoped নয়** — `handleImport`-এ existing vendors fetch করে (লাইন 288-290) কিন্তু `organization_id` filter নেই — cross-org duplicate false positive হবে

**উন্নতি:**
- Pagination যোগ (PAGE_SIZE = 25)
- SortableTableHeader যোগ (Name, Bills, Paid, Due)
- Native `confirm()` → `ConfirmDialog` component
- Import query-তে `organization_id` filter যোগ
- Stats-এ "Total Paid" কার্ড যোগ

---

### ৩. Expenses পেইজ (`src/pages/Expenses.tsx`)

**ত্রুটি:**
- **Pagination নেই** — Expenses ট্যাবে সব expense একসাথে লোড
- **Vendors ট্যাবেও pagination নেই** — Expenses পেইজের vendors section-এও pagination নেই
- **`handleDeleteExpense` ও `handleDeleteVendor` browser `confirm()` ব্যবহার করে** (লাইন 348, 659) — inconsistent with ConfirmDialog pattern
- **N+1 query সমস্যা** — `fetchData`-এ Vendors tab-এর জন্য প্রতিটি vendor-এর bills ও payments আলাদা query (লাইন 211-235)
- **Expenses পেইজ থেকে vendor due হিসাবে discount ধরা হচ্ছে না** — Expenses পেইজে vendor due calculate করতে শুধু `amount` নেয় (লাইন 225), কিন্তু Vendors পেইজে `net_amount` (amount - discount) ব্যবহার করে (লাইন 121-123) — inconsistent due calculation
- **`formatCurrency` local function** — shared function ব্যবহার হচ্ছে না
- **2176 লাইন — পেইজ অনেক বড়** — Vendors, Expenses, Categories তিনটি ট্যাবের সব লজিক একটি ফাইলে; কিন্তু refactor এই scope-এ নেই

**উন্নতি:**
- Expenses ট্যাবে pagination যোগ (PAGE_SIZE = 25)
- Native `confirm()` → `ConfirmDialog` component ব্যবহার
- Vendor due calculation-এ `net_amount` ব্যবহার — Vendors পেইজের সাথে consistent করা

---

### Implementation Plan

#### ফাইল ১: `src/pages/Customers.tsx`
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- Redundant individual icon buttons (View, Edit, Delete) সরানো — শুধু DropdownMenu রাখা
- Delete permission `isAdmin` → role-based consistent করা (`canRolePerform` ব্যবহার)
- Single delete-কে soft-delete করা (`is_deleted: true`)

#### ফাইল ২: `src/pages/Vendors.tsx`
- `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- SortableTableHeader import ও যোগ (Name, Bills, Paid, Due columns)
- Native `confirm()` → `ConfirmDialog` component + `deleteId` state
- Import query-তে `.eq('organization_id', organization?.id)` filter যোগ
- Stats grid-এ "Total Paid" কার্ড যোগ (2-col → grid-cols-2 lg:grid-cols-4)

#### ফাইল ৩: `src/pages/Expenses.tsx`
- Expenses ট্যাবে `currentPage` state + PAGE_SIZE = 25 + pagination controls যোগ
- `handleDeleteExpense` ও `handleDeleteVendor`-এ native `confirm()` → `ConfirmDialog` component
- Vendor due calculation fix: `b.amount` → `b.net_amount ?? (Number(b.amount) - Number(b.discount || 0))` — Vendors পেইজের সাথে consistent

