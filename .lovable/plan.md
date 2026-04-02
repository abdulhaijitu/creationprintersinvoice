

# ক্যাশ ইনভ্যালিডেশন কী মিসম্যাচ ফিক্স

## সমস্যা
ফর্মে `invalidateQueries({ queryKey: ['invoices'] })` কল হচ্ছে, কিন্তু লিস্ট পেইজে কুয়েরি কী `['invoices', orgId]`। React Query partial key matching-এ `['invoices']` দিয়ে `['invoices', orgId]` ম্যাচ হওয়া উচিত — কিন্তু `invalidateQueries` exact prefix match করে, তাই এটি কাজ করছে।

আসলে সমস্যা হচ্ছে `invalidateQueries` async — এটি `await` ছাড়া কল হচ্ছে, তারপর সাথে সাথে `navigate()` হচ্ছে। Navigate হলে component unmount হয়ে যায় এবং invalidation আর refetch সম্পূর্ণ হওয়ার আগেই নতুন পেইজ পুরনো cache থেকে ডেটা দেখায়।

## ফিক্স — `await` যোগ করা

### 1. `src/pages/InvoiceForm.tsx`
- Line ~484: `queryClient.invalidateQueries(...)` → `await queryClient.invalidateQueries(...)`
- Line ~572: Same

### 2. `src/pages/QuotationForm.tsx`
- Line ~330: `await` যোগ
- Line ~389: `await` যোগ

### 3. `src/pages/PriceCalculationForm.tsx`
- Line ~590, ~660-661, ~700-701: সব `invalidateQueries` কলে `await` যোগ

## মোট পরিবর্তন: 3টি ফাইল
প্রতিটিতে `invalidateQueries()` কলের আগে `await` যোগ করা হবে যাতে ক্যাশ রিফ্রেশ সম্পূর্ণ হওয়ার পরেই navigate হয়।

