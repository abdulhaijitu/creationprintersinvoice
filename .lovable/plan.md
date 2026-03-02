

## ডিপ পারফরম্যান্স রিফ্যাক্টর প্ল্যান

### বর্তমান অবস্থা

Dashboard ইতিমধ্যে `useQuery` + `Promise.all` ব্যবহার করে — ভালো। কিন্তু বাকি প্রায় সব হাই-ট্রাফিক পেজ (`Invoices`, `Expenses`, `Vendors`, `Employees`, `Quotations`, `Attendance`, `Salary`) এখনো raw `useEffect` + manual `setState` প্যাটার্ন ব্যবহার করছে, যার ফলে:

- রিভিজিটে ডেটা ক্যাশ হয় না, প্রতিবার ফ্রেশ ফেচ হয়
- `setLoading(true)` প্রতিবার ব্ল্যাংক স্ক্রিন দেখায়
- কোনো AbortController নেই → unmount-এ মেমোরি লিক
- Expenses পেজে `fetchData()` ফিল্টার চেঞ্জে পুরো ডেটা (categories + vendors + expenses) আবার ফেচ করে

---

### ফেজ ১: হাই-ইমপ্যাক্ট পেজগুলোতে useQuery মাইগ্রেশন (৫টি ফাইল)

**`src/pages/Invoices.tsx`**
- `useEffect` + `fetchInvoices` → `useQuery` দিয়ে রিপ্লেস
- Key: `queryKeys.invoices(orgId)`
- `staleTime: STALE_TIMES.LIST_DATA`
- Delete/update-এর পরে `queryClient.invalidateQueries` ব্যবহার
- `loading` state সরিয়ে `isLoading` from useQuery ব্যবহার

**`src/pages/Expenses.tsx`**
- তিনটি আলাদা `useQuery`: categories, vendors (with dues), expenses
- Categories ও vendors-এর `staleTime` বাড়ানো (`STALE_TIMES.USER_DATA`) কারণ কম চেঞ্জ হয়
- ফিল্টার চেঞ্জে শুধু expenses query invalidate হবে, categories/vendors নয়
- Expenses query key-তে ফিল্টার ভ্যালু ইনক্লুড করা

**`src/pages/Vendors.tsx`**
- `useEffect` + `fetchVendors` → `useQuery`
- Key: `queryKeys.vendors(orgId)`

**`src/pages/Employees.tsx`**
- `useEffect` + `fetchEmployees` → `useQuery`
- Key: `queryKeys.employees(orgId)`

**`src/pages/Quotations.tsx`**
- `useEffect` + `fetchQuotations` → `useQuery`
- Key: `queryKeys.quotations(orgId)`

### ফেজ ২: Expenses পেজে ফেচ স্প্লিটিং (১টি ফাইল — উপরের সাথেই)

**`src/pages/Expenses.tsx`** — বর্তমানে একটি `fetchData()` সব কিছু করে:
```
fetchData = categories + vendors + vendor_bills + vendor_payments + expenses
```
এটা ভেঙে ৩টি আলাদা query হবে:
1. `useQuery(['expense-categories', orgId])` → categories (স্ট্যাটিক, কম চেঞ্জ হয়)
2. `useQuery(['vendors-with-dues', orgId])` → vendors + bills + payments (Promise.all ভেতরে)
3. `useQuery(['expenses', orgId, filterCategory, filterVendor, filterMonth])` → expenses (ফিল্টার-ডিপেন্ডেন্ট)

এতে ফিল্টার চেঞ্জে শুধু expenses রিফেচ হবে, categories/vendors ক্যাশ থেকে আসবে।

### ফেজ ৩: Staggered Skeleton Loading (১টি ফাইল)

**`src/pages/Dashboard.tsx`**
- `loading || !stats` ব্লকে ৩টি কার্ডে staggered animation যোগ:
  ```
  style={{ animationDelay: `${i * 150}ms` }}
  className="animate-fade-in opacity-0 fill-mode-forwards"
  ```
- সিম্পল CSS animation, কোনো লাইব্রেরি দরকার নেই

### ফেজ ৪: Slow Fetch Logging Utility (১টি নতুন ফাইল)

**`src/lib/perfLogger.ts`** (নতুন)
- একটি `timedFetch` wrapper যা ১.৫ সেকেন্ডের বেশি সময় নিলে console.warn করবে
- Development mode-এ শুধু কাজ করবে
- useQuery-এর `queryFn`-এ ব্যবহার করা যাবে

### ফেজ ৫: AbortController Pattern (useQuery দিয়ে অটোমেটিক)

useQuery-তে মাইগ্রেশন করলে React Query নিজেই unmount-এ query cancel করে — আলাদা AbortController কোড লাগবে না।

---

### সারাংশ

| ফাইল | পরিবর্তন | ইমপ্যাক্ট |
|------|-----------|-----------|
| Invoices.tsx | useQuery মাইগ্রেশন | ক্যাশড নেভিগেশন, ফ্ল্যাশ দূর |
| Expenses.tsx | ৩টি আলাদা useQuery | ফিল্টারে ফুল রিফেচ বন্ধ |
| Vendors.tsx | useQuery মাইগ্রেশন | ক্যাশড নেভিগেশন |
| Employees.tsx | useQuery মাইগ্রেশন | ক্যাশড নেভিগেশন |
| Quotations.tsx | useQuery মাইগ্রেশন | ক্যাশড নেভিগেশন |
| Dashboard.tsx | Staggered skeleton | দ্রুত perceived লোডিং |
| perfLogger.ts | Slow fetch warning | ডিবাগিং সহজ |

মোট ৭টি ফাইল। UI অপরিবর্তিত। কোনো ফিচার রিমুভ নয়।

