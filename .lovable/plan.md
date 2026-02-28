

## Reports পেইজ — Profit/Loss Enhancement Plan

### বর্তমান সমস্যা
- Reports পেইজে শুধু Monthly এবং Yearly ফিল্টার আছে, **Custom Date Range (তারিখ থেকে তারিখ)** নেই
- Profit/Loss ক্যালকুলেশন আছে কিন্তু **একটু গভীরে দেখায় না** — শুধু Income - Expense = Net Profit দেখায়
- Monthly রিপোর্টে কোনো **চার্ট নেই** (চার্ট শুধু Yearly-তে আছে)
- **Vendor bill payments** খরচের মধ্যে কাউন্ট হচ্ছে expenses টেবিল থেকে (vendor bill → expense sync trigger আছে), তবে vendor due আলাদা দেখায়

### পরিবর্তনসমূহ

#### 1. Custom Date Range ফিল্টার যোগ
- Report Type-এ নতুন অপশন: `'monthly' | 'yearly' | 'custom'`
- Custom সিলেক্ট করলে **From Date** এবং **To Date** date picker দেখাবে
- যেকোনো তারিখ থেকে তারিখের রিপোর্ট বের করা যাবে

#### 2. Profit/Loss হাইলাইট কার্ড উন্নত করা
- Net Profit/Loss কার্ডে **Profit Margin %** যোগ: `(Net Profit / Total Income) × 100`
- কার্ডের ব্যাকগ্রাউন্ডে সবুজ (লাভ) বা লাল (লস) গ্রেডিয়েন্ট ইফেক্ট
- আগের পিরিয়ডের সাথে তুলনামূলক **↑/↓ শতাংশ পরিবর্তন** দেখাবে

#### 3. নতুন "Profit/Loss" ট্যাব যোগ
- Tabs-এ নতুন ট্যাব: **"Profit & Loss"**
- এই ট্যাবে থাকবে:
  - **P&L Summary Card**: Income, Expense, Gross Profit, Profit Margin % — বড় সংখ্যায়, সবুজ/লাল কালারে
  - **Monthly P&L Trend Chart** (AreaChart): প্রতিমাসে Income, Expense, এবং Profit লাইন — Custom range হলে দৈনিক
  - **Income vs Expense Comparison Bar**: পাশাপাশি বার চার্ট
  - **Category-wise Expense vs Income Ratio**: কোন ক্যাটেগরিতে কত খরচ হচ্ছে, মোট আয়ের কত %

#### 4. Monthly রিপোর্টেও Income/Expense চার্ট
- বর্তমানে Yearly-তে শুধু `BarChart` আছে — Monthly-তেও সেই পিরিয়ডের **দৈনিক Income vs Expense** AreaChart দেখাবে (Overview ট্যাবে)

### টেকনিক্যাল বিবরণ
- শুধুমাত্র `src/pages/Reports.tsx` ফাইল পরিবর্তন হবে
- কোনো DB পরিবর্তন নেই — বিদ্যমান `invoices` এবং `expenses` টেবিল থেকেই ডেটা আসবে
- date-fns ব্যবহার করে date range calculation
- recharts ব্যবহার করে নতুন চার্ট
- `date-picker` Popover ব্যবহার করে custom date range input

