

## পারফরম্যান্স হার্ড ফিক্স — বিশ্লেষণ ও পরিকল্পনা

---

### মূল সমস্যাসমূহ (Root Causes)

**১. N+1 Query — Expenses পেইজ (Critical)**
`Expenses.tsx` লাইন 214-241: প্রতিটি vendor-এর জন্য আলাদাভাবে `vendor_bills` এবং `vendor_payments` query চালায়। 20 vendor থাকলে 40+ query হয়। এটি সবচেয়ে বড় bottleneck।

**২. Missing Database Indexes (Critical)**
- `invoice_payments` — `invoice_id`, `organization_id`-তে কোনো index নেই (শুধু pkey আছে)
- `vendor_bills` — `vendor_id`, `organization_id`-তে কোনো index নেই
- `vendor_payments` — `vendor_id`, `organization_id`, `bill_id`-তে কোনো index নেই
- `employee_salary_records` — `organization_id`-তে কোনো index নেই
- `expenses` — `date`-তে কোনো index নেই (range query করে)

**৩. Dashboard-এ Tasks সব fetch করে**
`Dashboard.tsx` লাইন 73: `tasks` টেবিল থেকে সব task fetch করে শুধু status count করতে — `SELECT status` ঠিক আছে কিন্তু সব row আনা অপ্রয়োজনীয়। Database-এ `COUNT` + `GROUP BY` ব্যবহার করা উচিত।

**৪. Customers পেইজে সব invoices fetch**
`Customers.tsx` লাইন 150-153: সব invoices fetch করে JS-এ customer ভিত্তিক group করে। Database-এ aggregation করা উচিত।

**৫. `SELECT *` ব্যাপক ব্যবহার**
58+ জায়গায় `SELECT *` ব্যবহার হচ্ছে — অপ্রয়োজনীয় কলাম fetch করছে, payload বাড়াচ্ছে।

**৬. CompanySettingsContext-এ অতিরিক্ত console.log**
Production-এ 8+ console.log statement — প্রতিটি settings load, realtime event, subscription status-এ log হচ্ছে।

---

### Implementation Plan

#### মাইগ্রেশন: Missing Database Indexes
```sql
-- invoice_payments performance indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_org_id ON invoice_payments(organization_id);

-- vendor_bills performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor_id ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_org_id ON vendor_bills(organization_id);

-- vendor_payments performance indexes
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_org_id ON vendor_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_bill_id ON vendor_payments(bill_id);

-- salary records org index
CREATE INDEX IF NOT EXISTS idx_salary_records_org_id ON employee_salary_records(organization_id);

-- expenses date range queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(organization_id, date);

-- invoices date + customer composite indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON invoices(organization_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
```

#### ফাইল ১: `src/pages/Expenses.tsx`
- N+1 query ফিক্স: vendor-wise loop সরিয়ে একটি single query দিয়ে সব vendor_bills ও vendor_payments fetch → JS-এ group by vendor_id
- `SELECT *` → শুধু প্রয়োজনীয় columns select

#### ফাইল ২: `src/pages/Dashboard.tsx`
- Tasks query optimize: `.select('status')` রেখে দেওয়া (lightweight enough), কিন্তু future-proof হিসেবে RPC বা aggregation ব্যবহার করা optional
- Company settings query — অদরকারি, CompanySettingsContext থেকে নেওয়া (duplicate call সরানো)

#### ফাইল ৩: `src/pages/Customers.tsx`
- সব invoices fetch সরিয়ে, database-level aggregation ব্যবহার: customers query-তে invoice summary join করা অথবা একটি single aggregated query

#### ফাইল ৪: `src/pages/Invoices.tsx`
- `SELECT *` → specific columns: `id, invoice_number, customer_id, invoice_date, due_date, total, paid_amount, status`

#### ফাইল ৫: `src/hooks/useTasks.ts`
- `SELECT *` → specific columns: `id, title, status, priority, assigned_to, deadline, created_by, visibility, department, parent_task_id, invoice_item_id, item_no, sla_deadline, sla_breached, archived_at, archived_by, created_at, updated_at`

#### ফাইল ৬: `src/contexts/CompanySettingsContext.tsx`
- Production console.log statements সরানো (8টি)

#### ফাইল ৭: `src/contexts/PermissionContext.tsx`
- Production console.log statements সরানো (10+ টি)

**মোট: ১টি DB migration + ৭টি ফাইল পরিবর্তন।**

