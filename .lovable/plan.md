

# সাইডবার রিঅর্ডার + নতুন "Leads" মডিউল তৈরি

## সারাংশ
সাইডবারের গ্রুপ ও আইটেম সিরিয়াল পরিবর্তন করা হবে এবং একটি নতুন **Leads** পেইজ ও পারমিশন মডিউল যোগ করা হবে।

## নতুন গ্রুপ স্ট্রাকচার
```text
MAIN         → Dashboard
INVOICES     → Customers, Invoices, Payments, Challans
MARKETING    → Leads (নতুন), Price Calculation, Quotations
VENDORS      → Vendors, Expense
HR           → Employee, Attendance, Salary, Leave, Performance, Tasks
SYSTEM       → Reports, Team, Settings
```

## পরিবর্তনসমূহ

### 1. DB: `leads` টেবিল তৈরি (Migration)
- `id`, `organization_id`, `name`, `email`, `phone`, `company_name`, `source` (enum: website, referral, social, cold_call, other), `status` (enum: new, contacted, qualified, proposal, won, lost), `notes`, `assigned_to`, `created_by`, `created_at`, `updated_at`
- RLS: org-scoped read/write for authenticated users

### 2. Permission System আপডেট
**`src/lib/permissions/modulePermissions.ts`**:
- নতুন category: `marketing` যোগ (`PermissionCategory` type-এ)
- `MARKETING_PERMISSIONS` array: `marketing.leads`, `marketing.price_calculation`, `marketing.quotations`
- `MAIN_PERMISSIONS` থেকে quotations, price_calculation, challan সরানো
- `BUSINESS_PERMISSIONS` থেকে expenses → vendors group-এ
- `CATEGORY_DISPLAY`, `PERMISSIONS_BY_CATEGORY`, `ALL_MODULE_PERMISSIONS` আপডেট

### 3. Sidebar Config আপডেট
**`src/lib/permissions/sidebarConfig.ts`**:
- ৬টি গ্রুপে ভাগ: Main, Invoices, Marketing, Vendors, Human Resource, System
- Leads আইটেম যোগ (`/leads`, `Target` icon)
- আইটেম অর্ডার ইউজারের দেওয়া সিরিয়াল অনুযায়ী

### 4. Leads পেইজ তৈরি
**`src/pages/Leads.tsx`**:
- Leads টেবিল: Name, Company, Source, Status, Assigned To, Created
- Status badge (color-coded), Source filter, Status filter
- Add Lead dialog, Edit, Delete
- org-scoped data fetch

### 5. Route যোগ
**`src/App.tsx`**:
- `/leads` route যোগ

### 6. Mobile Sidebar আপডেট
**`src/components/layout/MobileSidebarTiles.tsx`** (যদি সাইডবার config থেকে generate হয় তাহলে স্বয়ংক্রিয়)

কোনো existing ফিচার ভাঙবে না — শুধু রিঅর্ডার + নতুন মডিউল।

