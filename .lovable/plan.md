

## সকল পেইজ অডিট ও ফিক্স — পারফরম্যান্স প্ল্যান

---

### চিহ্নিত সমস্যাসমূহ

**১. Vendors পেইজ — N+1 Query (Critical)**
`Vendors.tsx` লাইন 114-141: `Promise.all` দিয়ে প্রতিটি vendor-এর জন্য আলাদাভাবে `vendor_bills` ও `vendor_payments` query। Expenses পেইজে আগেই ঠিক করা হয়েছে কিন্তু Vendors পেইজে একই সমস্যা রয়ে গেছে। 20 vendor = 40+ query।

**২. Quotations পেইজ — `SELECT *` + Blocking RPC**
`Quotations.tsx` লাইন 115: প্রতিটি লোডে `auto_expire_quotations()` RPC কল — synchronous, পেইজ লোড ব্লক করে। তারপর `select('*')` দিয়ে সব কলাম ফেচ।

**৩. Reports পেইজ — `SELECT *` invoices ও expenses**
`Reports.tsx` লাইন 343-344: `invoices` থেকে `select('*, customers(name)')` — সব কলাম ফেচ করছে। `expenses` থেকেও `select('*, expense_categories(name)')` — অপ্রয়োজনীয় কলাম।

**৪. Employees পেইজ — `SELECT *`**
`Employees.tsx` লাইন 130-132: সব কলাম ফেচ করছে। শুধু লিস্ট ভিউ-এর জন্য প্রয়োজনীয় কলাম যথেষ্ট।

**৫. Expenses পেইজ — Vendors ও Categories `SELECT *`**
`Expenses.tsx` লাইন 199-211: `expense_categories` ও `vendors` থেকে `select('*')` — শুধু `id, name` যথেষ্ট।

**৬. usePayments হুক — দুইবার invoices query**
`usePayments.ts` লাইন 54-68 ও 114-117: প্রথমে payments সহ invoices ফেচ, তারপর আবার stats-এর জন্য সব invoices আলাদাভাবে ফেচ। দ্বিতীয় query অপ্রয়োজনীয়।

**৭. Salary পেইজ — একাধিক `SELECT *`**
`Salary.tsx`: salary records, advances সব `SELECT *` দিয়ে ফেচ।

**৮. Attendance, Leave, Performance — `SELECT *`**
সবগুলোতে `SELECT *` ব্যবহার।

---

### Implementation Plan

#### ফাইল ১: `src/pages/Vendors.tsx`
- N+1 query ফিক্স: vendor-wise loop সরিয়ে batch query (Expenses পেইজের মতো pattern)
- `SELECT *` → `id, name, phone, email, address, bank_info, notes`

#### ফাইল ২: `src/pages/Quotations.tsx`
- `auto_expire_quotations()` RPC কলকে non-blocking করা (fire-and-forget, await সরানো)
- `SELECT *` → `id, quotation_number, customer_id, quotation_date, valid_until, total, status, created_at, customers(name)`

#### ফাইল ৩: `src/pages/Reports.tsx`
- Invoices query: `'*, customers(name)'` → `'id, invoice_number, invoice_date, total, paid_amount, status, customer_id, customers(name)'`
- Expenses query: `'*, expense_categories(name)'` → `'id, date, amount, vendor_bill_id, category_id, expense_categories(name)'`

#### ফাইল ৪: `src/pages/Employees.tsx`
- `SELECT *` → `id, full_name, phone, email, designation, department, joining_date, basic_salary, is_active, photo_url`

#### ফাইল ৫: `src/pages/Expenses.tsx`
- Categories: `SELECT *` → `id, name, description`
- Vendors: `SELECT *` → `id, name, phone, email, address, bank_info, notes`

#### ফাইল ৬: `src/hooks/usePayments.ts`
- দ্বিতীয় invoices query সরানো — payments data থেকেই unique invoices extract করে stats calculate করা
- `SELECT *` → specific columns

#### ফাইল ৭: `src/pages/Salary.tsx`
- Salary records: `SELECT *` → প্রয়োজনীয় কলাম
- Advances: `SELECT *` → প্রয়োজনীয় কলাম

#### ফাইল ৮: `src/pages/Attendance.tsx`
- `SELECT *` → `id, employee_id, date, check_in, check_out, status, notes, is_overnight_shift`

#### ফাইল ৯: `src/pages/Leave.tsx`
- `SELECT *` → প্রয়োজনীয় কলাম

#### ফাইল ১০: `src/pages/Performance.tsx`
- `SELECT *` → প্রয়োজনীয় কলাম

**মোট: ১০টি ফাইল পরিবর্তন। কোনো নতুন ফিচার যোগ হবে না — শুধুমাত্র পারফরম্যান্স অপ্টিমাইজেশন।**

