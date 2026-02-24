

## Column Sorting — Invoices Table

### পরিবর্তন

**ফাইল: `src/pages/Invoices.tsx`**

1. **`SortableTableHeader` ও `useSortableTable` ইম্পোর্ট করা** — `src/components/shared/SortableTableHeader.tsx` থেকে।

2. **Sort state যোগ করা** — `useSortableTable` হুক ব্যবহার করে sort key ও direction ম্যানেজ করা হবে। ডিফল্ট sort: `invoice_date` descending।

3. **`filteredInvoices` এ sorting প্রয়োগ** — ফিল্টার করার পরে `sortData()` কল করা হবে। তবে কিছু কলামে nested/calculated value আছে (যেমন `customers.name`, `dueAmount`), তাই `sortData` এর বদলে কাস্টম sort লজিক লাগবে:
   - `invoice_date` → সরাসরি date comparison
   - `invoice_number` → string sort
   - `customer` → `invoice.customers?.name` দিয়ে sort
   - `total` → numeric
   - `paid_amount` → numeric
   - `due` → calculated `total - paid_amount`
   - `status` → `getDisplayStatus()` ফাংশন দিয়ে sort

4. **টেবিল হেডার আপডেট** — প্রতিটি sortable কলামে `SortableTableHeader` কম্পোনেন্ট ব্যবহার করা হবে (Bulk Select ও Action কলাম বাদে)। ক্লিক করলে asc → desc → reset cycle হবে।

### টেকনিক্যাল ডিটেইল

```text
Before:
<TableHead>Date</TableHead>  (plain text)

After:
<TableHead>
  <SortableTableHeader
    label="Date"
    sortKey="invoice_date"
    currentSortKey={sortKey}
    currentSortDirection={sortDirection}
    onSort={handleSort}
  />
</TableHead>
```

- কাস্টম sort function তৈরি হবে যা nested fields (customer name) ও calculated fields (due amount) হ্যান্ডেল করবে
- `filteredInvoices` কে sort করে `sortedInvoices` বানানো হবে, এবং টেবিল ও মোবাইল কার্ড উভয়েই `sortedInvoices` ব্যবহার করবে

