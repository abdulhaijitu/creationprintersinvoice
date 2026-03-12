

# Skeleton Loading ইস্যু অডিট ও ফিক্স

## সমস্যা

অনেক পেইজে লোডিং স্টেটে প্রফেশনাল skeleton এর বদলে প্লেইন **"Loading..."** টেক্সট দেখায়। এটি UX-এ খারাপ দেখায় এবং প্রজেক্টের loading experience standard (staggered skeleton reveal) মেনে চলে না।

## পেইজ-ভিত্তিক ইস্যু ম্যাপ

| পেইজ | ডেস্কটপ টেবিল | মোবাইল কার্ড | মন্তব্য |
|-------|---------------|-------------|---------|
| **Invoices** | ✅ ইনলাইন skeleton আছে | ✅ | ঠিক আছে |
| **Quotations** | ✅ `TableSkeleton` | ✅ | ঠিক আছে |
| **DeliveryChallans** | ✅ `TableSkeleton` | ✅ | ঠিক আছে |
| **PriceCalculations** | ✅ `TableSkeleton` | ✅ | ঠিক আছে |
| **Tasks** | ✅ `TableSkeleton` | ✅ | ঠিক আছে |
| **Salary** | ❌ "Loading..." (৩ জায়গা) | ❌ "Loading..." | Salary টেবিল + Advances টেবিল + মোবাইল |
| **Leave** | ❌ "Loading..." | ❌ "Loading..." | ডেস্কটপ + মোবাইল |
| **Performance** | ❌ "Loading..." | ❌ "Loading..." | ডেস্কটপ + মোবাইল |
| **Employees** | ❌ "Loading..." | ❌ "Loading..." | ডেস্কটপ + মোবাইল |
| **Expenses** | ❌ "Loading..." (৪ জায়গা) | ❌ "Loading..." | Vendors টেবিল + Expenses টেবিল + মোবাইল ×2 |
| **Customers** | ✅ | ✅ | ঠিক আছে (চেক করা হয়নি কিন্তু TableSkeleton ইম্পোর্ট নেই — আবার দেখতে হবে কোডে) |

## সমাধান

প্রতিটি "Loading..." কে `TableSkeleton` (ডেস্কটপ) ও `CardSkeleton` / ইনলাইন skeleton (মোবাইল) দিয়ে রিপ্লেস করা হবে। `@/components/shared` থেকে ইম্পোর্ট ব্যবহার করা হবে।

## পরিবর্তনের তালিকা

| ফাইল | পরিবর্তন |
|-------|----------|
| `src/pages/Salary.tsx` | ৩টি "Loading..." → `TableSkeleton` (salary table, advances table) + মোবাইলে `CardSkeleton` |
| `src/pages/Leave.tsx` | ২টি "Loading..." → `TableSkeleton` + মোবাইলে skeleton cards |
| `src/pages/Performance.tsx` | ২টি "Loading..." → `TableSkeleton` + মোবাইলে skeleton cards |
| `src/pages/Employees.tsx` | ২টি "Loading..." → `TableSkeleton` + মোবাইলে skeleton cards |
| `src/pages/Expenses.tsx` | ৪টি "Loading..." → `TableSkeleton` (vendors + expenses tables) + মোবাইলে skeleton cards |

**প্রতিটি ফাইলে:**
1. `TableSkeleton` ইম্পোর্ট যোগ
2. ডেস্কটপ: `<TableCell>Loading...</TableCell>` → সম্পূর্ণ `<TableSkeleton rows={5} columns={N} />` দিয়ে রিপ্লেস
3. মোবাইল: `"Loading..."` টেক্সট → `Skeleton` কার্ড (3-4টি rows, staggered animation delay সহ)

**মোট: ৫টি ফাইলে ~১৩টি "Loading..." রিপ্লেসমেন্ট। কোনো ফিচার বা লজিক পরিবর্তন হবে না।**

