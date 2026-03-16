

# লোডিং স্টেট অডিট ও ফিক্স

## সমস্যা চিহ্নিত

সব পেইজ পরীক্ষা করে নিচের সমস্যাগুলো পাওয়া গেছে:

### ক্যাটাগরি ১: "Loading..." টেক্সট বা কাঁচা স্পিনার (নিষিদ্ধ)
| পেইজ | সমস্যা |
|---|---|
| **VendorDetail** | `<p>Loading...</p>` — প্লেইন টেক্সট |
| **CustomerDetail** | কাঁচা CSS স্পিনার `border-b-2 border-primary` |
| **ResetPassword** | কাঁচা CSS স্পিনার + "Checking status..." টেক্সট |
| **Settings** | শুধু `Loader2` আইকন, কোনো স্কেলেটন নেই |
| **Salary** (auth check) | শুধু `Loader2` আইকন |
| **Reports** (auth check) | শুধু `Loader2` আইকন |

### ক্যাটাগরি ২: ডিটেইল পেইজে `animate-pulse` ব্লব (একটু ভালো, কিন্তু কন্টেন্টের সাথে মেলে না)
| পেইজ | সমস্যা |
|---|---|
| **InvoiceDetail** | ২টা ব্লক `animate-pulse` — স্ট্রাকচার মেলে না |
| **QuotationDetail** | একই |
| **PriceCalculationForm** | একই |

### ক্যাটাগরি ৩: সঠিক স্কেলেটন ✅ (ফিক্স লাগবে না)
Invoices, Customers, Vendors, Expenses, Quotations, PriceCalculations, Tasks, Employees, Attendance, Leave, Performance, Salary (টেবিল), Payments, Dashboard — এগুলোতে সঠিক `Skeleton` বা `TableSkeleton`/`CardSkeleton` ব্যবহার হচ্ছে।

## পরিবর্তন

### ৬টি ফাইলে ফিক্স:

**1. `src/pages/VendorDetail.tsx`** — `Loading...` → প্রোপার স্কেলেটন (হেডার + ট্যাবস + কার্ড লেআউট)

**2. `src/pages/CustomerDetail.tsx`** — কাঁচা স্পিনার → প্রোপার স্কেলেটন (হেডার + স্ট্যাটস কার্ড + টেবিল)

**3. `src/pages/ResetPassword.tsx`** — CSS স্পিনার → `Loader2` আইকন (ফুল পেইজ ফর্মে শুধু স্পিনার যথেষ্ট, কিন্তু Skeleton UI ব্যবহার হবে)

**4. `src/pages/Settings.tsx`** — Loader2 আইকন → ট্যাবযুক্ত স্কেলেটন

**5. `src/pages/InvoiceDetail.tsx`** — অর্থবোধক স্কেলেটন (হেডার + সামারি কার্ড + আইটেম টেবিল)

**6. `src/pages/QuotationDetail.tsx`** — একই ধরনের অর্থবোধক স্কেলেটন

**7. `src/pages/Salary.tsx`** — auth loading-এ Loader2 → TableSkeleton

**8. `src/pages/Reports.tsx`** — auth loading-এ Loader2 → Skeleton ব্লক

কোনো DB মাইগ্রেশন লাগবে না। শুধু JSX পরিবর্তন।

