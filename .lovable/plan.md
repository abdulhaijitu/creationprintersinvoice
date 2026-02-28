

## Reports > Profit & Loss — সম্পূর্ণ রিডিজাইন

### বর্তমান সমস্যা
- **Income হিসাবে শুধু `paid_amount`** ব্যবহার হচ্ছে — Invoice Amount (total) আলাদা দেখায় না
- **Collection Amount ও Due Amount** আলাদা কার্ডে নেই
- **Expense-এ শুধু `expenses` টেবিল** কাউন্ট হচ্ছে — **Vendor Bill** এবং **Salary** আলাদাভাবে যোগ হচ্ছে না
- ফলে আসল Profit/Loss বোঝা যায় না

### নতুন P&L ফর্মুলা
```text
Invoice Amount (মোট বিল)          = SUM(invoices.total)
Collection Amount (আদায়)          = SUM(invoices.paid_amount)
Due Amount (বাকি)                 = Invoice Amount - Collection Amount

Expense Breakdown:
  ├─ Vendor Bills                  = SUM(vendor_bills.net_amount) [selected period]
  ├─ Office/Other Expenses         = SUM(expenses.amount) [selected period]
  └─ Salary                        = SUM(employee_salary_records.net_payable) [selected period]
Total Expense                      = Vendor + Expense + Salary

Net Profit / Loss                  = Invoice Amount - Total Expense
```

### পরিবর্তনসমূহ

#### 1. Data Fetching আপডেট (`fetchReportData`)
- নতুন query: `vendor_bills` — `bill_date` range দিয়ে ফিল্টার, `net_amount` সাম
- নতুন query: `employee_salary_records` — `year`/`month` ফিল্টার করে `net_payable` সাম
- `invoices` থেকে `total` (Invoice Amount) ও `paid_amount` (Collection) আলাদা ক্যালকুলেট
- `ReportData` interface-এ নতুন ফিল্ড: `totalInvoiceAmount`, `totalCollection`, `totalDue`, `vendorBillExpense`, `salaryExpense`, `officeExpense`

#### 2. P&L Summary কার্ড রিডিজাইন (৬টি কার্ড, ২ সারি)
**সারি ১ — আয়ের দিক:**
- **Invoice Amount** (মোট বিল) — নীল
- **Collection** (আদায়) — সবুজ
- **Due Amount** (বাকি) — কমলা

**সারি ২ — খরচের দিক:**
- **Vendor Bills** — লাল
- **Expenses + Salary** — লাল
- **Net Profit/Loss** — সবুজ/লাল (ডায়নামিক)

#### 3. Expense Breakdown পাই চার্ট
- Vendor Bills, Office Expenses, Salary — তিনটি সেগমেন্ট সহ `PieChart`
- প্রতিটিতে পরিমাণ ও শতাংশ

#### 4. P&L Statement টেবিল
- অ্যাকাউন্টিং স্টেটমেন্ট ফরম্যাটে:
  ```text
  Revenue
    Invoice Amount        ৳XX,XXX
    Collection            ৳XX,XXX
    Due                   ৳XX,XXX
  ─────────────────────────────
  Expenses
    Vendor Bills          ৳XX,XXX
    Office Expenses       ৳XX,XXX
    Salary                ৳XX,XXX
    Total Expense         ৳XX,XXX
  ─────────────────────────────
  Net Profit / Loss       ৳XX,XXX
  ```

### টেকনিক্যাল বিবরণ
- **ফাইল:** শুধু `src/pages/Reports.tsx`
- **নতুন DB Query:** `vendor_bills` (bill_date range), `employee_salary_records` (year/month filter)
- **কোনো DB মাইগ্রেশন নেই** — বিদ্যমান টেবিল ব্যবহার
- Existing AreaChart/BarChart তে কোনো পরিবর্তন নেই — শুধু Summary কার্ড ও P&L ট্যাবের কন্টেন্ট আপডেট

