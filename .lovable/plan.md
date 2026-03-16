

# Invoices কন্ট্রোল বার — স্ক্রল ছাড়া কম্প্যাক্ট ডিজাইন

## সমস্যা
বর্তমানে ৮+ আইটেম একই রো-তে থাকায় `overflow-x-auto` স্ক্রল হচ্ছে, বিশেষ করে ছোট স্ক্রিনে।

## সমাধান
ফিল্টারগুলোকে একটি **Filter Popover** এর ভেতরে নিয়ে যাওয়া। মূল রো-তে শুধু:

```text
[ 🔍 Search...              ] [⚙ Filter (2)] [↑Import] [↓Export] [+ New Invoice]
```

- **Search**: `flex-1` দিয়ে বাকি জায়গা নেবে
- **Filter বাটন**: ক্লিক করলে Popover খুলবে — ভেতরে Status, Month, Date Range, Customer ফিল্টার থাকবে (2-column grid)
- **Active filter count** badge দিয়ে দেখাবে কয়টি ফিল্টার চালু
- **Import/Export/New**: আইকন-only মোবাইলে, টেক্সটসহ ডেস্কটপে
- `overflow-x-auto` ও `flex-nowrap` সরিয়ে দেওয়া হবে

### Filter Popover ভেতরের লেআউট:
```text
┌─────────────────────────────────┐
│  Status: [All Status     ▼]    │
│  Month:  [All Months     ▼]    │
│  Customer: [All Customers ▼]   │
│  Date Range: [📅 Select...]    │
│                                 │
│  [Clear All Filters]           │
└─────────────────────────────────┘
```

## পরিবর্তন
**ফাইল: `src/pages/Invoices.tsx`** — একটি ফাইলে সব পরিবর্তন

- `overflow-x-auto`, `flex-nowrap`, `no-scrollbar` ক্লাস রিমুভ
- Status, Month, Date Range, Customer সিলেক্ট গুলো একটি `Popover` কম্পোনেন্টের ভেতরে মুভ
- Filter বাটনে active count badge
- মূল রো: `flex flex-wrap gap-2 items-center`
- মোবাইলে Search `w-full` প্রথম লাইনে, বাটনগুলো দ্বিতীয় লাইনে wrap হবে

কোনো DB পরিবর্তন নেই।

