

## Expenses পেইজ — Vendors, Expenses, Categories ট্যাব উন্নতকরণ

তিনটি ট্যাবের UI/UX উন্নত করা হবে — আরও professional, visually rich এবং informative করে।

---

### পরিবর্তনসমূহ (শুধু `src/pages/Expenses.tsx`)

#### 1. Vendors ট্যাব
- **Vendor কার্ড (মোবাইল):** Avatar/initials circle যোগ, due amount badge আরও prominent, gradient border-left দিয়ে due status indicate (সবুজ=Paid, লাল=Due)
- **Vendor টেবিল (ডেস্কটপ):** রো-তে সূক্ষ্ম কালার কোডিং — due থাকলে `bg-destructive/5`, paid হলে সাধারণ
- **ভেন্ডর কাউন্ট ব্যাজ:** হেডারে `(12 vendors)` ব্যাজ যোগ
- **Quick action buttons:** মোবাইল কার্ডে "Add Bill" ও "Pay" বাটন যোগ

#### 2. Expenses ট্যাব
- **Expense কার্ড (মোবাইল):** Payment method আইকন (Cash=Wallet, Bank=CreditCard, bKash=Smartphone) যোগ, কার্ডে left-border color (destructive) দিয়ে খরচ highlight
- **টেবিল রো Enhancement:** Amount কলামে destructive color, total row footer যোগ (সব এক্সপেন্সের মোট)
- **ফিল্টার বার উন্নতকরণ:** ফিল্টার কাউন্ট ব্যাজ, "Clear Filters" বাটন
- **এক্সপেন্স কাউন্ট ব্যাজ:** হেডারে `(45 expenses)` ব্যাজ
- **Total Amount ব্যাজ:** হেডারে মোট এক্সপেন্সের পরিমাণ দেখানো

#### 3. Categories ট্যাব
- **কার্ড ডিজাইন উন্নতকরণ:** প্রতিটি কার্ডে category-wise মোট খরচ দেখানো (শুধু কাউন্ট নয়, টাকার পরিমাণও)
- **Progress bar:** Category-wise খরচের শতাংশ progress bar
- **কার্ড আইকন ব্যাকগ্রাউন্ড:** Tag আইকনে gradient/muted background circle
- **কাউন্ট ব্যাজ হেডারে:** `(8 categories)` ব্যাজ
- **Empty description styling:** "No description" placeholder স্টাইল উন্নত

---

### টেকনিক্যাল ডিটেইল

**নতুন computed data:**
- `categoryExpenseTotals` — প্রতিটি category-র মোট খরচ calculate করে `useMemo` দিয়ে
- `maxCategoryTotal` — progress bar-এর জন্য সর্বোচ্চ খরচের category

**Vendor row color coding:**
```
vendor.due_amount > 0 → className="bg-destructive/5"
vendor.due_amount <= 0 → default
```

**Expense table footer row:**
```
<TableFooter> → Total: formatCurrency(totalExpenses)
```

**Mobile card left-border:**
```
className="border-l-4 border-l-destructive" (expenses)
className="border-l-4 border-l-primary" (vendors with no due)
className="border-l-4 border-l-destructive" (vendors with due)
```

**Category progress bar:**
```
<Progress value={(categoryTotal / maxCategoryTotal) * 100} />
```

**Import যোগ:**
- `Progress` from `@/components/ui/progress`
- `Smartphone` from `lucide-react`

কোনো ডাটাবেস পরিবর্তন লাগবে না।

