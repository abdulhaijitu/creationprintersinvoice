

## Invoices পেইজ — সমস্যা ও উন্নতির সুযোগ

### সমস্যাসমূহ (Bugs/Issues)

1. **`confirm()` ব্রাউজার ডায়ালগ ব্যবহৃত হচ্ছে** (লাইন 143) — Single invoice delete-এ native `confirm()` ব্যবহার হচ্ছে, কিন্তু bulk delete-এ সুন্দর `ConfirmDialog` আছে। Inconsistent UX।

2. **Pagination নেই** — সব ইনভয়েস একসাথে লোড হয়, ১০০০+ ইনভয়েস থাকলে পারফরম্যান্স সমস্যা হবে (Supabase 1000 row limit-ও hit করবে)।

3. **Mobile কার্ডে Edit অপশন নেই** — ডেস্কটপ ড্রপডাউনে Export আছে কিন্তু Edit নেই। মোবাইলে শুধু View ও Delete।

4. **Dropdown-এ "Export" single invoice export করে না** — ড্রপডাউনে Export ক্লিক করলে পুরো লিস্ট CSV export হয়, specific invoice export হয় না। Misleading।

5. **`InvoiceTableActions` কম্পোনেন্ট অব্যবহৃত** — আলাদা `InvoiceTableActions.tsx` তৈরি আছে কিন্তু Invoices পেইজে ব্যবহৃত হচ্ছে না, inline actions লেখা।

6. **`useIsMobile` hook import করা হয়নি** — মোবাইল ভিউ CSS দিয়ে `hidden md:block` / `block md:hidden` করা হয়েছে, তবে mobile-specific behavior নেই।

### উন্নতির সুযোগ

1. **Pagination যোগ করা** — প্রতি পেইজে ২০/৫০টি ইনভয়েস দেখানো, Next/Previous বাটন।

2. **Single delete-এ `ConfirmDialog` ব্যবহার** — native `confirm()` সরিয়ে প্রিমিয়াম ConfirmDialog।

3. **Date Range ফিল্টার** — তারিখ অনুযায়ী ইনভয়েস ফিল্টার করার অপশন।

4. **Row-level Edit বাটন** — প্রতি ইনভয়েসের পাশে Edit আইকন যোগ।

5. **Per-row dropdown ঠিক করা** — Export অপশন সরিয়ে Edit, Mark Paid, Send Reminder যোগ।

6. **Customer-wise ফিল্টার** — নির্দিষ্ট কাস্টমারের ইনভয়েস দেখার অপশন।

7. **Table footer-এ Total summary** — ফিল্টার করা ইনভয়েসের মোট Total, Paid, Due দেখানো।

### প্রস্তাবিত পরিবর্তন (Implementation Plan)

#### ফাইল: `src/pages/Invoices.tsx`

1. **Single delete → ConfirmDialog**: নতুন state `singleDeleteId` যোগ, `handleDelete`-এ `confirm()` সরিয়ে dialog open করা
2. **Row dropdown উন্নত করা**: Export সরিয়ে Edit (`/invoices/{id}/edit`), Mark Paid (due থাকলে) যোগ
3. **Mobile কার্ডে Edit বাটন যোগ**
4. **Table footer-এ summary row**: filtered invoices-এর Total, Paid, Due দেখানো
5. **Pagination**: `currentPage` state, page size 25, paginated slice দেখানো, Next/Prev controls

