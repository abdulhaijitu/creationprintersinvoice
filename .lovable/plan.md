

# Invoice পেমেন্ট রিয়েলটাইম আপডেট ফিক্স

## সমস্যা

পেমেন্ট এন্ট্রি দেওয়ার পর InvoiceDetail ও Invoices লিস্ট পেজে স্ট্যাটাস আপডেট হচ্ছে না। কারণ:

1. **InvoiceDetail** পেজ ম্যানুয়াল `useState` দিয়ে ডেটা ম্যানেজ করছে — React Query ক্যাশের সাথে সিঙ্ক নেই
2. `AddPaymentDialog` এর `onPaymentAdded` কলব্যাক `fetchInvoice` কল করে, কিন্তু Invoices লিস্টের React Query ক্যাশ **invalidate করে না**
3. ফলে লিস্টে ফিরে গেলে পুরানো ক্যাশড ডেটা দেখায়

## সমাধান

### ফাইল ১: `src/pages/InvoiceDetail.tsx`
- `useQueryClient` ইম্পোর্ট করো
- `onPaymentAdded` কলব্যাকে `fetchInvoice()` এর সাথে সাথে Invoices লিস্ট ও Payments কুয়েরি **invalidate** করো:
  ```typescript
  const queryClient = useQueryClient();
  const handlePaymentAdded = () => {
    fetchInvoice(); // রিফেচ ইনভয়েস ডিটেইল
    queryClient.invalidateQueries({ queryKey: ['invoices'] }); // লিস্ট ক্যাশ ক্লিয়ার
    queryClient.invalidateQueries({ queryKey: ['payments'] }); // পেমেন্ট ক্যাশ ক্লিয়ার
  };
  ```
- `onPaymentAdded={handlePaymentAdded}` সেট করো

### ফাইল ২: `src/pages/Invoices.tsx`
- `handleMarkSinglePaid` ফাংশনে পেমেন্ট ক্যাশও invalidate করো:
  ```typescript
  invalidateInvoices();
  queryClient.invalidateQueries({ queryKey: ['payments'] });
  ```

**মোট পরিবর্তন: ২টি ফাইলে ছোট কোড যোগ। UI/ডিজাইনে কোনো পরিবর্তন নেই।**

