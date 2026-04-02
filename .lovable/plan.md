

# এডিট/ডিটেইল পেইজে SPA নেভিগেশনে লোডিং আটকে যাওয়া ফিক্স

## সমস্যা
ইনভয়েস এডিট, কোটেশন এডিট, ইনভয়েস ডিটেইল, কোটেশন ডিটেইল, কাস্টমার ডিটেইল, ভেন্ডর ডিটেইল — এই পেইজগুলো `useEffect` + manual async fetch ব্যবহার করে। SPA নেভিগেশনে (ক্লিক করে যাওয়া) এই fetch হ্যাং হয়ে যায়, কিন্তু রিফ্রেশ দিলে কাজ করে। লিস্ট পেইজগুলো React Query ব্যবহার করে বলে সেগুলোতে এই সমস্যা নেই।

## মূল কারণ
- manual `useEffect` fetch-এ কোনো AbortController নেই — কম্পোনেন্ট unmount/remount হলে পুরানো request cancel হয় না
- Auth token refresh চলাকালীন supabase request queue হয়ে আটকে যায়
- `finally` block-এ `setFetching(false)` execute হয় না যদি request resolve না হয়

## ফিক্স — AbortController যোগ করা (6টি ফাইল)

প্রতিটি ফাইলে `useEffect` এর মধ্যে `AbortController` যোগ করা হবে যাতে নেভিগেশনে পুরানো request cancel হয় এবং timeout-এ আটকে না থাকে।

### 1. `src/pages/InvoiceForm.tsx`
- `fetchInvoice` ও `fetchCustomers` কে `useEffect` এর ভিতরে নিয়ে আসা
- AbortController দিয়ে cleanup
- Timeout safety net (10 সেকেন্ড)

```typescript
useEffect(() => {
  const controller = new AbortController();
  
  const loadData = async () => {
    try {
      // fetchCustomers inline
      const { data } = await supabase
        .from('customers').select('...').order('name')
        .abortSignal(controller.signal);
      if (!controller.signal.aborted) setCustomers(data || []);
    } catch {}
    
    if (isEditing && !controller.signal.aborted) {
      setFetching(true);
      try {
        // fetch invoice, items, costing — same logic
        // pass controller.signal to each query
      } catch (e) {
        if (!controller.signal.aborted) toast.error('Failed to load');
      } finally {
        if (!controller.signal.aborted) setFetching(false);
      }
    } else if (!isEditing) {
      setItems([{ id: crypto.randomUUID(), ... }]);
    }
  };
  
  loadData();
  return () => controller.abort();
}, [id, isEditing]);
```

### 2. `src/pages/QuotationForm.tsx`
- একই প্যাটার্ন — `fetchCustomers` ও `fetchQuotation` কে AbortController দিয়ে wrap

### 3. `src/pages/InvoiceDetail.tsx`
- `fetchInvoice` এ AbortController + cleanup

### 4. `src/pages/QuotationDetail.tsx`
- `fetchQuotation` এ AbortController + cleanup

### 5. `src/pages/CustomerDetail.tsx`
- `fetchCustomerData` এ AbortController + cleanup

### 6. `src/pages/VendorDetail.tsx`
- `fetchVendorData` এ AbortController + cleanup

## প্রতিটি ফাইলে যা পরিবর্তন হবে
1. `useEffect` এর ভিতরে `AbortController` তৈরি
2. Supabase query-তে `.abortSignal(controller.signal)` যোগ
3. State update-এর আগে `!controller.signal.aborted` চেক
4. `useEffect` cleanup-এ `controller.abort()` কল
5. Error handler-এ AbortError ignore করা

## মোট পরিবর্তন: 6টি ফাইল

