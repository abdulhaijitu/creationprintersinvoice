

# All Bills ট্যাবে Vendor-wise ফিল্টার যোগ

## পরিবর্তন

**ফাইল: `src/components/vendor/AllBillsTab.tsx`**

1. **Vendors লিস্ট ফেচ**: একটি আলাদা `useQuery` দিয়ে `vendors` টেবিল থেকে org-এর সব ভেন্ডরের `id` ও `name` আনা
2. **Vendor ফিল্টার state**: `vendorFilter` state যোগ (default: `"all"`)
3. **Query-তে ফিল্টার**: `vendorFilter !== "all"` হলে `.eq("vendor_id", vendorFilter)` যোগ
4. **UI**: স্ট্যাটাস ফিল্টারের পাশে একটি Vendor সিলেক্ট ড্রপডাউন যোগ — "All Vendors" ডিফল্ট, বাকি ভেন্ডরদের নাম alphabetically
5. **Clear button**: `activeFilterCount`-এ vendor ফিল্টার কাউন্ট যোগ, ক্লিয়ার বাটনে vendor রিসেট

কোনো DB মাইগ্রেশন লাগবে না।

