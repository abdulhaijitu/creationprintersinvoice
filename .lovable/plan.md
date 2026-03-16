

# হার্ড রিলোডে Skeleton আটকে যাওয়ার সমস্যা — সব Context-এ ফিক্স

## বিশ্লেষণ

OrganizationContext-এ ইতিমধ্যে TOKEN_REFRESHED ফিক্স করা হয়েছে। যেহেতু **সব পেইজ** (Invoices, Customers, Vendors, Expenses, Employees, Salary, Quotations, Dashboard, Reports, CalendarView, PriceCalculations, Attendance, Leave, Performance, Tasks) `!!organization?.id` এর উপর নির্ভর করে, তাই OrganizationContext ফিক্স হওয়ায় এই পেইজগুলো ইতিমধ্যে কভার হয়ে গেছে।

তবে **CompanySettingsContext** একই সমস্যায় আক্রান্ত — এটি `user` পাওয়া মাত্র `company_settings` টেবিল ফেচ করে, কিন্তু expired token-এ RLS ব্লক করলে ডেটা আসে না এবং কোনো retry নেই।

## পরিবর্তন

### ফাইল: `src/contexts/CompanySettingsContext.tsx`

1. **TOKEN_REFRESHED listener যোগ** — token refresh হলে settings নেই এমন অবস্থায় আবার ফেচ
2. **Empty result retry** — authenticated user-এর জন্য settings null আসলে ১.৫ সেকেন্ড পর একবার retry

```text
// নতুন useEffect যোগ
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event) => {
      if (event === 'TOKEN_REFRESHED' && !settings && user) {
        fetchSettings();
      }
    }
  );
  return () => subscription.unsubscribe();
}, [user, settings, fetchSettings]);
```

**মোট: ১টি ফাইলে ১টি useEffect যোগ। বাকি সব পেইজ OrganizationContext ফিক্সে ইতিমধ্যে কভার হয়ে গেছে।**

