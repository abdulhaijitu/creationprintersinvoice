

# Edit Invoice "Saving..." স্টাক ইস্যু ফিক্স

## সমস্যা বিশ্লেষণ

Edit Invoice-এ Save করলে "Saving..." দেখায় এবং আটকে যায়। কোড বিশ্লেষণে কয়েকটি সমস্যা পাওয়া গেছে:

1. **Error handling অসম্পূর্ণ**: `for` loop-এর ভেতরে individual item update/delete-এ error check নেই। কোনো operation fail করলে error silently swallow হয়ে পরের operation-এ আটকে যেতে পারে।
2. **`invoice_costing_items as any` delete**: Type cast-এর কারণে runtime error হতে পারে যা catch হচ্ছে না।
3. **Empty `invoice_date` guard নেই**: যদি DateInput থেকে empty string আসে, DB update fail হবে।

## ফিক্স — `src/pages/InvoiceForm.tsx`

### 1. Invoice date validation যোগ (line ~357)
```typescript
if (!formData.invoice_date) {
  toast.error('Please select an invoice date');
  return;
}
```

### 2. Delete loop-এ error checking (lines 414-419)
```typescript
if (itemsToDelete.length > 0) {
  // Costing items delete - ignore errors (table may not exist)
  for (const itemId of itemsToDelete) {
    try {
      await supabase.from('invoice_costing_items' as any).delete().eq('invoice_item_id', itemId);
    } catch {}
  }
  const { error: deleteError } = await supabase.from('invoice_items').delete().in('id', itemsToDelete);
  if (deleteError) throw deleteError;
}
```

### 3. Update loop-এ error checking (lines 421-429)
```typescript
for (const { id: itemId, item } of itemsToUpdate) {
  const { error: updateError } = await supabase.from('invoice_items').update({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit || null,
    unit_price: item.unit_price,
    discount: 0,
    total: item.total,
  }).eq('id', itemId);
  if (updateError) throw updateError;
}
```

### 4. Costing items save — edit path-এ missing (line 446 এর পরে)
Create path-এ costing items save আছে (line 517-533) কিন্তু edit path-এ নেই। Edit path-এও costing items save যোগ করা হবে।

## মোট পরিবর্তন: ১টি ফাইল
- Invoice date empty validation
- Error checking সব DB operation-এ
- Edit path-এ costing items save logic

