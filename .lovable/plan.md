

# Vendors পেইজে "All Bills" ট্যাব যোগ — সব বিল এক জায়গায়

## বর্তমান অবস্থা
Vendors পেইজে শুধু ভেন্ডর লিস্ট দেখায়। পৃথক বিল দেখতে প্রতিটি ভেন্ডরের ডিটেইলে যেতে হয়। সব ভেন্ডরের বিল একসাথে দেখার কোনো উপায় নেই।

## সমাধান

Vendors পেইজে Tabs যোগ করা হবে: **"Vendors"** (বর্তমান ভিউ) এবং **"All Bills"** (নতুন)।

### All Bills ট্যাব ফিচার:
1. **টেবিল কলাম**: Date, Vendor, Description, Amount, Discount, Net Amount, Paid, Due, Status
2. **ফিল্টার**:
   - **মাসিক**: Month/Year সিলেক্ট (ডিফল্ট: বর্তমান মাস)
   - **ডেট রেঞ্জ**: Calendar popover দিয়ে কাস্টম from-to
   - **স্ট্যাটাস**: All / Paid / Partial / Unpaid (Due)
   - মাসিক সিলেক্ট করলে ডেট রেঞ্জ ক্লিয়ার হবে এবং উল্টো
3. **সামারি কার্ড**: ফিল্টার অনুযায়ী Total Bills, Total Paid, Total Due দেখাবে
4. **মোবাইল**: কার্ড ভিউ

### UI লেআউট
```text
┌────────────────────────────────────────────────┐
│ Vendors                                        │
│ ┌──────────┬───────────┐                       │
│ │ Vendors  │ All Bills │  (Tabs)               │
│ └──────────┴───────────┘                       │
│                                                │
│ [This Month ▾] [Date Range 📅] [Status ▾] [×] │
│                                                │
│ ┌─────────┬─────────┬──────────┐               │
│ │Total    │Paid     │Due       │  (Summary)    │
│ └─────────┴─────────┴──────────┘               │
│                                                │
│ ┌──────────────────────────────────────────┐   │
│ │ Date │ Vendor │ Desc │ Net │ Paid │ Stat │   │
│ │ ...  │ ...    │ ...  │ ... │ ...  │ ...  │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

### টেকনিক্যাল ডিটেইলস

**ফাইল: `src/pages/Vendors.tsx`** — একটি ফাইলে সব পরিবর্তন

- বর্তমান vendor list কে `TabsContent value="vendors"` এ wrap করা
- নতুন `TabsContent value="bills"` যোগ করা
- All Bills ট্যাবের জন্য আলাদা `useQuery` — `vendor_bills` টেবিল থেকে `vendors(name)` join সহ ফেচ
- ফিল্টার state: `billMonth` (string), `billDateRange` ({from, to}), `billStatus` (all/paid/partial/unpaid)
- DB query তে `bill_date` এ `.gte()` `.lte()` এবং `status` ফিল্টার
- Summary কার্ড ফিল্টারড ডেটা থেকে calculate হবে
- Pagination আলাদা থাকবে

**কোনো DB মাইগ্রেশন লাগবে না।** `vendor_bills` টেবিলে সব দরকারি কলাম (`bill_date`, `status`, `net_amount`, `paid_amount`, `vendor_id`) ইতিমধ্যে আছে।

