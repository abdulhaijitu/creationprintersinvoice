

# ফর্ম সেভের পর টেবিল/লিস্ট ক্যাশ ইনভ্যালিডেশন ফিক্স

## সমস্যা
InvoiceForm, QuotationForm, PriceCalculationForm — এই ফর্মগুলো সেভ/আপডেটের পর `navigate()` করে কিন্তু React Query ক্যাশ invalidate করে না। ফলে লিস্ট পেইজে পুরানো (stale) ডেটা দেখায়।

## চিহ্নিত সমস্যা (3টি ফাইল)

| ফাইল | সমস্যা |
|---|---|
| `InvoiceForm.tsx` | Edit/Create-এর পর `queryKeys.invoices` invalidate হয় না |
| `QuotationForm.tsx` | Edit/Create-এর পর `queryKeys.quotations` invalidate হয় না |
| `PriceCalculationForm.tsx` | Save-এর পর price-calculations cache invalidate হয় না; Invoice/Quotation create-এর পরও সংশ্লিষ্ট cache invalidate হয় না |

## ফিক্স

### 1. `src/pages/InvoiceForm.tsx`
- `useQueryClient` import যোগ
- `navigate()` এর আগে cache invalidate:
```typescript
const queryClient = useQueryClient();

// Edit path (line ~482):
queryClient.invalidateQueries({ queryKey: ['invoices'] });
toast.success('Invoice updated');
navigate(`/invoices/${id}`);

// Create path (line ~569):
queryClient.invalidateQueries({ queryKey: ['invoices'] });
toast.success('Invoice created');
navigate(`/invoices/${invoice.id}`);
```

### 2. `src/pages/QuotationForm.tsx`
- `useQueryClient` import যোগ
- Edit ও Create path-এ cache invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['quotations'] });
```

### 3. `src/pages/PriceCalculationForm.tsx`
- `useQueryClient` import যোগ
- Save, Convert-to-Invoice, Convert-to-Quotation path-এ সংশ্লিষ্ট cache invalidate:
```typescript
queryClient.invalidateQueries({ queryKey: ['price-calculations'] });
// এবং invoice/quotation create করলে সেগুলোর cache-ও
queryClient.invalidateQueries({ queryKey: ['invoices'] });
queryClient.invalidateQueries({ queryKey: ['quotations'] });
```

## মোট পরিবর্তন: 3টি ফাইল
প্রতিটিতে `useQueryClient` import এবং `navigate()` এর আগে `invalidateQueries()` কল যোগ।

