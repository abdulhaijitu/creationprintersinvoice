

# পেমেন্ট দেওয়ার পর ইনভয়েস লিস্ট আপডেট না হওয়ার সমস্যা — ফিক্স

## Root Cause (মূল কারণ)

দুটি সমস্যা একসাথে কাজ করছে:

### ১. `onPaymentAdded` কলব্যাক ১.৫ সেকেন্ড দেরিতে চলে
`AddPaymentDialog.tsx` এ পেমেন্ট সফল হওয়ার পর `onPaymentAdded()` একটি `setTimeout` এর ভিতরে চলে (1500ms delay)। ইউজার যদি এর আগে রিফ্রেশ দেয় বা ব্যাক করে, তাহলে **query invalidation কখনোই হয় না**।

```typescript
// সমস্যাযুক্ত কোড (AddPaymentDialog.tsx:179-182)
setTimeout(() => {
  onOpenChange(false);
  onPaymentAdded();  // ← এটি ১.৫ সেকেন্ড পরে চলে!
}, 1500);
```

### ২. React Query কনফিগ — `refetchOnMount: false`
`useQueryConfig.ts` এ `refetchOnMount: false` সেট করা আছে। তাই ইউজার যখন ইনভয়েস লিস্টে ফিরে আসে, React Query পুরনো ক্যাশড ডেটা দেখায়, নতুন করে ফেচ করে না।

## সমাধান

### ফাইল ১: `src/components/invoice/AddPaymentDialog.tsx`
- পেমেন্ট সফল হওয়ার সাথে সাথেই `onPaymentAdded()` কল করবে (delay ছাড়া)
- শুধু UI বন্ধ হওয়াটা delayed থাকবে

### ফাইল ২: `src/hooks/useQueryConfig.ts`
- `refetchOnMount: false` → `refetchOnMount: true` করা হবে যাতে stale ডেটা থাকলে mount-এ refetch হয়

### ফাইল ৩: `src/pages/InvoiceDetail.tsx`
- `queryKey: ['invoices']` → `queryKeys.invoices(...)` ব্যবহার করে consistent key নিশ্চিত করা

**মোট: ৩টি ফাইলে ছোট পরিবর্তন।**

