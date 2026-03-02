

## ডিপ পারফরম্যান্স অডিট ও রিফ্যাক্টর প্ল্যান

### অডিট ফলাফল

**ইতিমধ্যে অপটিমাইজড (কোনো পরিবর্তন নয়):**
- Dashboard, Invoices, Expenses, Vendors, Employees, Quotations → `useQuery` দিয়ে ক্যাশড
- OrganizationContext → স্পেসিফিক কলাম সিলেক্ট, dedup guard
- CompanySettingsContext → কন্ডিশনাল লোডিং, স্পেসিফিক কলাম
- PermissionContext → 60s cooldown on tab focus
- NotificationManager → org filter + limit + deferred startup
- useTasks → Promise.all + Map lookup
- perfLogger.ts → slow fetch warning utility

**এখনো সমস্যাযুক্ত পেজ ও প্যাটার্ন:**

| সমস্যা | ফাইল | বিবরণ |
|--------|------|-------|
| Raw useEffect + sequential fetch | Attendance.tsx | `fetchData()` sequential: employees → attendance, `setLoading(true)` প্রতিবার |
| Raw useEffect + sequential fetch | Salary.tsx | `fetchData()` sequential: employees → salary → advances, `setLoading(true)` প্রতিবার |
| Console warning | Dashboard.tsx | `MetricColumn` gets refs passed — React.memo missing `forwardRef` |
| Realtime without org filter | CompanySettingsContext | Global subscription on `company_settings` table |

---

### ফেজ ১: Attendance পেজ useQuery মাইগ্রেশন (১টি ফাইল)

**`src/pages/Attendance.tsx`**
- `useEffect` + `fetchData()` → ২টি আলাদা `useQuery`:
  1. `useQuery(['employees', orgId])` → employees list (ক্যাশড, কম চেঞ্জ হয়)
  2. `useQuery(['attendance', orgId, selectedDate, selectedEmployee])` → attendance records (date/filter ডিপেন্ডেন্ট)
- Employees query-এ `staleTime: STALE_TIMES.USER_DATA` (5 min)
- ডেট বা ফিল্টার চেঞ্জে শুধু attendance query রিফেচ হবে
- `setLoading(true)` সরিয়ে `isLoading` from useQuery ব্যবহার
- Employee matching-এ Map lookup ব্যবহার (O(1))

### ফেজ ২: Salary পেজ useQuery মাইগ্রেশন (১টি ফাইল)

**`src/pages/Salary.tsx`**
- `fetchData()` → ৩টি `useQuery`:
  1. `useQuery(['employees', orgId])` → employees (shared key with Attendance!)
  2. `useQuery(['salary', orgId, selectedYear, selectedMonth])` → salary records
  3. `useQuery(['advances', orgId])` → advances
- Promise.all না লাগবে কারণ useQuery নিজেই parallel চালায়
- Employee matching-এ Map lookup ব্যবহার
- Month/year চেঞ্জে শুধু salary query রিফেচ, employees ক্যাশ থেকে আসবে

### ফেজ ৩: Dashboard MetricColumn ref warning ফিক্স (১টি ফাইল)

**`src/pages/Dashboard.tsx`**
- Console error: "Function components cannot be given refs"
- `MetricColumn`-কে `React.memo` দিয়ে wrap করলে এটা ফিক্স হবে না — আসল সমস্যা হলো Card-এর child হিসেবে ref pass হচ্ছে
- সমাধান: `React.memo(React.forwardRef(...))` অথবা wrapper div দিয়ে isolate

### ফেজ ৪: Attendance fetchData-তে Promise.all (উপরের সাথেই)

Attendance-এ employees আর attendance data sequential ফেচ হচ্ছে — useQuery মাইগ্রেশনে এটা অটো parallel হবে।

### ফেজ ৫: Salary fetchData-তে Promise.all (উপরের সাথেই)

Salary-তে employees, salary records, advances sequential — useQuery মাইগ্রেশনে অটো parallel।

---

### সারাংশ

| ফাইল | পরিবর্তন | ইমপ্যাক্ট |
|------|-----------|-----------|
| Attendance.tsx | ২টি useQuery, Map lookup | ক্যাশড, parallel fetch, loading flash দূর |
| Salary.tsx | ৩টি useQuery, Map lookup | ক্যাশড, parallel fetch, loading flash দূর |
| Dashboard.tsx | MetricColumn ref warning ফিক্স | Console error দূর |

মোট ৩টি ফাইল। UI অপরিবর্তিত। কোনো ফিচার রিমুভ নয়।

