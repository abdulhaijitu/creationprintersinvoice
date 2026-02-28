

## পুরো সফটওয়্যার বিশ্লেষণ — ত্রুটি ও উন্নতি

আমি পুরো কোডবেস পড়ে নিচের ত্রুটিগুলো চিহ্নিত করেছি। এগুলো ৫টি ক্যাটাগরিতে ভাগ করা হয়েছে।

---

### ক্যাটাগরি ১: লজিক ত্রুটি (Critical Bugs)

**১.১ Quotations.tsx — `useMemo` দিয়ে `setState` (React anti-pattern)**
- লাইন 270: `useMemo(() => { setCurrentPage(1); }, [...])` — `useMemo` এর ভেতর `setState` কল করা React-এর নিয়ম ভঙ্গ করে। Render-এর সময় state update হলে infinite loop বা unexpected behavior হতে পারে।
- **ফিক্স:** `useMemo` → `useEffect` দিয়ে replace করা।

**১.২ CustomerDetail.tsx — Payments query org-scoped নয়**
- লাইন 93-104: `invoice_payments` fetch করে কিন্তু কোনো `organization_id` বা customer-scoped filter নেই। সব organization-এর সব payment fetch করে JS-এ filter করে (লাইন 109-110)।
- **ফিক্স:** `.eq('invoices.customer_id', id)` SQL-level filter যোগ করা।

**১.৩ VendorDetail.tsx — `confirm()` ব্যবহার (2 জায়গায়)**
- লাইন 307, 450: Bill ও Payment delete-এ native `confirm()` — inconsistent with `ConfirmDialog` pattern।
- **ফিক্স:** `ConfirmDialog` component ব্যবহার + `deleteId` state।

**১.৪ PriceCalculationForm.tsx — `window.confirm()` ব্যবহার**
- লাইন 714: Delete-এ `window.confirm()` — inconsistent।
- **ফিক্স:** `ConfirmDialog` component ব্যবহার।

---

### ক্যাটাগরি ২: Consistency (Local formatCurrency সরানো)

**৮টি ফাইলে local `formatCurrency` function আছে** যা shared `@/lib/formatters` ব্যবহার করে না:

| ফাইল | লাইন |
|---|---|
| Invoices.tsx | 277-279 |
| Payments.tsx | 86-88 |
| InvoiceDetail.tsx | 157-163 |
| CustomerDetail.tsx | 133-139 |
| QuotationForm.tsx | 401-406 |
| QuotationDetail.tsx | 359-365 |
| VendorDetail.tsx | 492-498 |
| PriceCalculationForm.tsx | 419-424 |

**ফিক্স:** প্রতিটি ফাইলে local function সরিয়ে `import { formatCurrency } from '@/lib/formatters'` ব্যবহার। 

> Note: Invoices.tsx ও Payments.tsx-এ format ভিন্ন (`৳` prefix vs `Intl.NumberFormat`) — shared function-এ standardize করা হবে।

---

### ক্যাটাগরি ৩: Relationship / Data Query ত্রুটি

**৩.১ CustomerDetail.tsx — Payment query সব payment fetch করে**
- Organization-wide payment fetch → JS filter → N+1-like behavior।
- **ফিক্স:** Invoice IDs collect করে `.in('invoice_id', invoiceIds)` filter ব্যবহার।

---

### ক্যাটাগরি ৪: UI/UX ও Responsive ত্রুটি

**৪.১ VendorDetail.tsx — Mobile responsive নয়**
- 1185 লাইনের পেইজে Bills ও Payments টেবিল মোবাইলে horizontal scroll করে।
- **ফিক্স:** Mobile card view যোগ করা (`md:hidden`)।

**৪.২ CustomerDetail.tsx — Mobile responsive নয়**
- Invoices ও Payments টেবিল মোবাইলে scroll সমস্যা।
- **ফিক্স:** Mobile card view যোগ করা।

---

### ক্যাটাগরি ৫: Optimization

**৫.১ Dashboard.tsx — company_settings query org-scoped নয়**
- লাইন 125: `.limit(1).single()` — কোনো org filter নেই। Multi-tenant-এ ভুল company name দেখাতে পারে।
- **ফিক্স:** `.eq('organization_id', orgId)` filter যোগ।

---

### Implementation Plan (ফাইল ভিত্তিক)

#### ফাইল ১: `src/pages/Quotations.tsx`
- লাইন 270: `useMemo(() => { setCurrentPage(1) })` → `useEffect(() => { setCurrentPage(1) }, [deps])`

#### ফাইল ২: `src/pages/CustomerDetail.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার
- Payment query fix: invoice IDs দিয়ে scoped query
- Mobile card view যোগ (Invoices ও Payments tabs-এ)

#### ফাইল ৩: `src/pages/VendorDetail.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার
- `confirm()` → `ConfirmDialog` (Bill delete + Payment delete)
- Mobile card view যোগ (Bills ও Payments tabs-এ)

#### ফাইল ৪: `src/pages/Invoices.tsx`
- Local `formatCurrency` (লাইন 277-279) সরিয়ে shared import ব্যবহার

#### ফাইল ৫: `src/pages/Payments.tsx`
- Local `formatCurrency` (লাইন 86-88) সরিয়ে shared import ব্যবহার

#### ফাইল ৬: `src/pages/InvoiceDetail.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার

#### ফাইল ৭: `src/pages/QuotationForm.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার

#### ফাইল ৮: `src/pages/QuotationDetail.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার

#### ফাইল ৯: `src/pages/PriceCalculationForm.tsx`
- Local `formatCurrency` সরিয়ে shared import ব্যবহার
- `window.confirm()` → `ConfirmDialog`

#### ফাইল ১০: `src/pages/Dashboard.tsx`
- Company settings query-তে `.eq('organization_id', orgId)` filter যোগ

**মোট: ১০টি ফাইল পরিবর্তন হবে।**

