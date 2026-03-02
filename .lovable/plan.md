

## সাইডবার নেভিগেশন স্লো — রুট প্রিফেচিং সমাধান

### মূল কারণ

প্রতিটি পেজ `React.lazy()` দিয়ে code-split করা। সাইডবারে ক্লিক করলে:
1. React Router navigate হয়
2. JS chunk নেটওয়ার্ক থেকে ফেচ হয় (প্রথমবার)
3. তারপর কম্পোনেন্ট রেন্ডার হয়

এই chunk fetch-ই delay তৈরি করে — বিশেষত প্রথমবার ভিজিট করলে।

### সমাধান: হোভারে প্রিফেচ

সাইডবার লিংকে **hover** করলে সেই পেজের lazy chunk আগেই লোড করা শুরু হবে। ক্লিক করার সময় chunk ইতিমধ্যে ক্যাশে থাকবে — instant navigation।

**১. `src/lib/routePrefetch.ts`** — নতুন ফাইল
- প্রতিটি route path-কে তার lazy import function-এ ম্যাপ করা
- `prefetchRoute(path)` ফাংশন — import() কল করে কিন্তু await করে না (fire-and-forget)
- একবার প্রিফেচ হলে Set-এ ট্র্যাক — দ্বিতীয়বার কল হবে না

**২. `src/components/layout/AppSidebar.tsx`** — NavLink-এ `onMouseEnter` যোগ
- হোভারে `prefetchRoute(item.url)` কল
- কোনো UI পরিবর্তন নেই, শুধু chunk আগেই লোড হবে

### টেকনিক্যাল ডিটেইল

```text
User hovers "Invoices" → import("./pages/Invoices") fires
User clicks "Invoices" → chunk already in browser cache → instant render
```

মোট ২টি ফাইল। ১টি নতুন, ১টি এডিট। UI অপরিবর্তিত।

