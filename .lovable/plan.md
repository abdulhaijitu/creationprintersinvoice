

# Invoices পেইজে Month, Date Range ও Client ফিল্টার যোগ

## বর্তমান অবস্থা
Invoices পেইজে শুধু **Search** ও **Status** ফিল্টার আছে। Month, Date Range বা Client অনুযায়ী ফিল্টার করার সুবিধা নেই।

## পরিবর্তন

**ফাইল: `src/pages/Invoices.tsx`** — একটি ফাইলে সব পরিবর্তন

### নতুন ফিল্টার:

1. **Monthly ফিল্টার** — Month/Year সিলেক্ট (ডিফল্ট: "All Months")। URL param: `month` (format: `YYYY-MM`)
2. **Date Range ফিল্টার** — Calendar popover দিয়ে from-to সিলেক্ট। URL param: `from`, `to`। মাসিক সিলেক্ট করলে ডেট রেঞ্জ ক্লিয়ার হবে এবং উল্টো
3. **Client ফিল্টার** — ড্রপডাউন সিলেক্ট, সব কাস্টমারের লিস্ট। URL param: `client`

### লজিক:
- সব ফিল্টার client-side `useMemo` এ `filteredInvoices` এর মধ্যে প্রয়োগ হবে (বর্তমান প্যাটার্ন অনুসরণ)
- Month ফিল্টার `invoice_date` এর year-month ম্যাচ করবে
- Date Range ফিল্টার `invoice_date` এ from/to চেক করবে
- Client ফিল্টার `customer_id` ম্যাচ করবে
- Unique customer list `invoices` ডেটা থেকেই বের করা হবে (আলাদা query লাগবে না)
- Clear Filters বাটন — সব ফিল্টার রিসেট করবে, active filter count দেখাবে
- সব ফিল্টার URL params এ persist হবে (বর্তমান `updateParam` প্যাটার্ন ব্যবহার)

### UI:
Controls সেকশনের grid layout আপডেট — Search, Status, Month, Date Range, Client ও Actions একসাথে থাকবে। মোবাইলে wrap হবে।

কোনো DB মাইগ্রেশন লাগবে না।

