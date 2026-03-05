
# ইনভয়েস টেবিলে কাস্টমার নাম ক্লিকেবল করা

## পরিবর্তন: `src/pages/Invoices.tsx`

### ডেস্কটপ টেবিল (লাইন ~842-844)
কাস্টমার নামকে একটি ক্লিকেবল লিংকে রূপান্তর করা হবে। `customer_id` থাকলে `/customers/:id` এ নেভিগেট করবে, `stopPropagation` দিয়ে রো-ক্লিক (ইনভয়েস ডিটেইল) ব্লক করবে।

```tsx
<TableCell className="text-foreground truncate max-w-[120px] lg:max-w-[180px]">
  {invoice.customer_id ? (
    <span
      className="hover:underline hover:text-primary cursor-pointer"
      onClick={(e) => { e.stopPropagation(); navigate(`/customers/${invoice.customer_id}`); }}
    >
      {invoice.customers?.name || '—'}
    </span>
  ) : (invoice.customers?.name || '—')}
</TableCell>
```

### মোবাইল কার্ড (লাইন ~947-949)
একইভাবে কাস্টমার নামকে ক্লিকেবল করা হবে, `stopPropagation` সহ।

**মোট পরিবর্তন: ১টি ফাইলে ২ জায়গায় ছোট পরিবর্তন।**
