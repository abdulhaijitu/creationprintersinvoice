# Invoices — ফিল্টার বার একই রো-তে রাখা

## বর্তমান অবস্থা

- Customer ফিল্টার ইতিমধ্যে আছে ("Client" নামে) — Row 2 তে
- Row 1: Search + Import/Export/New Invoice
- Row 2: Status, Month, Date Range, Client, Clear

## পরিবর্তন (ফাইল: `src/pages/Invoices.tsx`)

### সব কন্ট্রোল একটি রো-তে

- Row 1 ও Row 2 মার্জ করে একটি horizontal-scroll row বানানো
- ক্রম: Search → Status → Month → Date Range → Customer → Clear | Import → Export → +New Invoice
- `overflow-x-auto` + `no-scrollbar` + `flex-nowrap` মোবাইলে স্ক্রল করবে
- Search input width: `min-w-[180px] max-w-[250px]` (ডেস্কটপে সুন্দর, মোবাইলে ওভারফ্লো হবে না)

কোনো DB পরিবর্তন নেই।