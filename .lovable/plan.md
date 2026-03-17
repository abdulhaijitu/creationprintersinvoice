
# Vendors টেবিলে Paid/Due ফিল্টার যোগ

## পরিবর্তন (ফাইল: `src/pages/Vendors.tsx`)

### ফিল্টার স্টেট যোগ
- নতুন `paymentFilter` state: `"all"` | `"paid"` | `"due"`

### ফিল্টার লজিক
- `"paid"` → `due_amount <= 0` (পুরো পরিশোধ হয়েছে)
- `"due"` → `due_amount > 0` (বাকি আছে)
- `"all"` → সব ভেন্ডর

### UI — Search বারের পাশে ফিল্টার বাটন গ্রুপ
Search ইনপুটের ডানে তিনটি Toggle/Badge বাটন রাখা হবে:
```text
[ 🔍 Search vendors...     ] [All] [Due] [Paid]
```
- Active বাটনে primary স্টাইল, বাকিগুলো outline
- `filteredVendors`-এ `paymentFilter` চেক যোগ
- ফিল্টার পরিবর্তনে `currentPage` রিসেট

কোনো DB পরিবর্তন নেই।
