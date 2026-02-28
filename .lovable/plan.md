

## Dashboard সিম্প্লিফিকেশন ও ডিজাইন এনহান্সমেন্ট

### বর্তমান অবস্থা
Dashboard-এ এখন অনেক কিছু আছে: ৫টি সামারি কার্ড, Invoices (৬ কার্ড), Quotations (৬ কার্ড), Delivery Challans (৫ কার্ড), Production Tasks (৫ কার্ড), Alerts, Charts (AreaChart, PieChart), HR Snapshot, Recent Invoices, Expense Breakdown, ApprovalsPanel — মোট ~১৩২৮ লাইন।

### পরিবর্তন
সব সরিয়ে **শুধু ৩টি সেকশন** রাখা হবে, প্রিমিয়াম shadcn ডিজাইনে:

#### 1. Monthly Invoices কার্ড
- একটি প্রিমিয়াম কার্ডে ৩টি মেট্রিক পাশাপাশি:
  - **Total** = `SUM(invoices.total)` এই মাসের
  - **Payments** = `SUM(invoices.paid_amount)` এই মাসের
  - **Due** = Total - Payments
- কার্ডে ক্লিক করলে `/invoices`-এ যাবে
- Due amount লাল/সবুজ হাইলাইট

#### 2. Monthly Expenses কার্ড
- একটি প্রিমিয়াম কার্ডে ৩টি সাব-মেট্রিক + Total:
  - **Vendor Bills** = `SUM(vendor_bills.net_amount)` এই মাসের
  - **Office Expenses** = `SUM(expenses.amount)` এই মাসের (vendor_bill_id ছাড়া)
  - **Salary** = `SUM(employee_salary_records.net_payable)` এই মাসের
  - **Total** = Vendor + Expense + Salary
- কার্ডে ক্লিক করলে `/expenses`-এ যাবে

#### 3. Production Tasks কার্ড
- একটি প্রিমিয়াম কার্ডে ৩টি মেট্রিক:
  - **Active** = tasks যেগুলো `todo`, `in_progress`, `design`, `printing`, `packaging` স্ট্যাটাসে
  - **Delivered** = `delivered` স্ট্যাটাস
  - **Archived** = `archived` স্ট্যাটাস
- কার্ডে ক্লিক করলে `/tasks`-এ যাবে

### ডিজাইন
- প্রতিটি সেকশন একটি `Card` — ভিতরে ৩-৪টি মেট্রিক কলাম, `Separator` দিয়ে আলাদা
- বড় সংখ্যা, সিমেন্টিক কালার, আইকন, সাবটাইটেল
- গ্রিড: মোবাইলে ১ কলাম, ডেস্কটপে ৩ কলাম
- Header + "View Reports" বাটন রাখা হবে
- Loading skeleton আপডেট — ৩টি কার্ড
- Mobile home tiles (`/` route) আগের মতো থাকবে

### টেকনিক্যাল বিবরণ
- **ফাইল:** শুধু `src/pages/Dashboard.tsx`
- **নতুন DB Query:** `vendor_bills` (bill_date range), `employee_salary_records` (year/month)
- `DashboardStats` interface সিম্প্লিফাই — শুধু প্রয়োজনীয় ফিল্ড
- Quotations, Delivery Challans, Alerts, Charts, HR Snapshot, Recent Invoices, Expense Breakdown, ApprovalsPanel — সব রিমুভ
- অব্যবহৃত imports ক্লিনআপ

