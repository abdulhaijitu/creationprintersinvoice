

# Invoices পেইজ স্লো লোডিং — বিশ্লেষণ ও সমাধান

## সমস্যা চিহ্নিত

Invoices পেইজ (`src/pages/Invoices.tsx`) — **1133 লাইনের** বড় কম্পোনেন্ট। নিচের কারণে স্লো হচ্ছে:

### ১. Stats কম্পিউটেশন মেমোাইজ করা নেই (লাইন 579-583)
প্রতিটি রেন্ডারে **সব ইনভয়েস** ৪+ বার লুপ করে `getDisplayStatus()` এবং `getInvoiceStatusInfo()` কল করছে — এগুলো `useMemo` ছাড়া সরাসরি কম্পোনেন্ট বডিতে আছে।

### ২. বড় JS Bundle
1133 লাইনের কম্পোনেন্ট + অনেক ইম্পোর্ট (date-fns, xlsx, recharts, etc.) — lazy-loaded চাঙ্ক সাইজ বড়।

### ৩. Mobile Card কম্পোনেন্ট ইনলাইন
মোবাইল ভিউর কার্ড রেন্ডারিং একই ফাইলে — অপ্রয়োজনীয় কোড ডেস্কটপে লোড হচ্ছে।

## সমাধান

### ফাইল: `src/pages/Invoices.tsx`

**A. Stats মেমোাইজ করা:**
```typescript
// আগে (লাইন 579-583) — প্রতি রেন্ডারে 4x লুপ
const totalInvoices = invoices.length;
const paidCount = invoices.filter(i => getDisplayStatus(i) === 'paid').length;
...

// পরে — একবার লুপ, useMemo দিয়ে ক্যাশ
const { totalInvoices, paidCount, dueCount, partialCount, totalDueAmount } = useMemo(() => {
  let paid = 0, due = 0, partial = 0, dueAmt = 0;
  for (const inv of invoices) {
    const info = getInvoiceStatusInfo(inv);
    if (info.displayStatus === 'paid') paid++;
    else if (info.displayStatus === 'due') due++;
    else if (info.displayStatus === 'partial') partial++;
    dueAmt += info.dueAmount;
  }
  return { totalInvoices: invoices.length, paidCount: paid, dueCount: due, partialCount: partial, totalDueAmount: dueAmt };
}, [invoices]);
```

**B. `filteredInvoices`-এ ক্যাশড status ব্যবহার:**
`getDisplayStatus()` কে `filteredInvoices` এবং `sortedInvoices` দুটোতেই বারবার কল হচ্ছে — একবার ক্যাশ করে ব্যবহার করা।

**C. Import ডায়নামিক করা:**
`CSVImportDialog` শুধু বাটন ক্লিক করলে দরকার — `React.lazy` দিয়ে ডায়নামিক ইম্পোর্ট করা।

**মোট পরিবর্তন: ১টি ফাইলে ~30 লাইন পরিবর্তন।**

