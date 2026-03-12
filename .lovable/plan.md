

# Invoices পেইজ — Skeleton Loading ও কলাম ফিক্স

## সমস্যা

1. **Skeleton কম্পোনেন্ট ব্যবহার হয়নি** — raw `div` + `animate-pulse` ব্যবহার করা হয়েছে `Skeleton` কম্পোনেন্টের বদলে
2. **মোবাইলে আলাদা skeleton নেই** — ডেস্কটপ স্টাইলের skeleton মোবাইলে ভাঙা দেখায়
3. **Responsive কলাম ম্যাচ হয় না** — টেবিলে Paid কলাম `hidden xl:table-cell` এবং Status `hidden lg:table-cell`, কিন্তু skeleton-এ সব কলাম সবসময় দেখায়
4. **Staggered animation নেই** — প্রজেক্ট স্ট্যান্ডার্ড অনুযায়ী ১৫০-২০০ms delay দিয়ে reveal হওয়া উচিত

## সমাধান

**ফাইল: `src/pages/Invoices.tsx`** — Lines 737-756 রিপ্লেস

### ডেস্কটপ Skeleton (hidden md:block):
- `Skeleton` কম্পোনেন্ট ইম্পোর্ট করে ব্যবহার
- Paid কলাম `hidden xl:block`, Status কলাম `hidden lg:block` — টেবিল হেডারের সাথে ম্যাচ
- Staggered delay: প্রতি row-তে `animationDelay: ${i * 150}ms`

### মোবাইল Skeleton (block md:hidden):
- ৩টি কার্ড skeleton — বর্তমান মোবাইল কার্ড লেআউটের সাথে ম্যাচ
- প্রতিটিতে invoice number, customer, date, total placeholders

**মোট: ১টি ফাইলে ১টি সেকশন রিপ্লেস + ১টি ইম্পোর্ট যোগ।**

