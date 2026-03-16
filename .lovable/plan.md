

# Invoices পেইজ UI/UX অডিট ও ফিক্স

## চিহ্নিত সমস্যা ও সমাধান

### 1. Empty State — নতুন ফিল্টার চেক করে না
- শুধু `searchQuery` ও `statusFilter` চেক করে, কিন্তু month/client/dateRange ফিল্টার একটিভ থাকলেও "Create your first invoice" দেখায়
- **ফিক্স**: `activeFilterCount > 0` দিয়ে সব ফিল্টারের জন্য সঠিক মেসেজ দেখাবে

### 2. মোবাইলে Date Range Calendar — 2 মাস overflow করে
- `numberOfMonths={2}` মোবাইলে স্ক্রিনের বাইরে চলে যায়
- **ফিক্স**: `useIsMobile()` ব্যবহার করে মোবাইলে `numberOfMonths={1}` সেট

### 3. মোবাইল কার্ডে অতিরিক্ত বাটন — কমপ্যাক্ট করা দরকার
- View, Edit, Delete — ৩টা আলাদা বাটন জায়গা নষ্ট করছে
- **ফিক্স**: View বাটন রেখে বাকিগুলো একটি `MoreHorizontal` DropdownMenu-তে নিয়ে যাওয়া (ডেস্কটপ প্যাটার্নের মতো)

### 4. Table Row — alternating color ও status color সংঘর্ষ
- `index % 2` striping + `due` bg-destructive/5 মিক্স হচ্ছে — ভিজ্যুয়ালি confusing
- **ফিক্স**: alternating stripe রিমুভ, শুধু hover state রাখা (ডিজাইন সিস্টেম অনুযায়ী `hover:bg-muted/50`)

### 5. Overdue ইন্ডিকেটর নেই
- `isOverdue` ক্যালকুলেট হয় কিন্তু কোথাও দেখানো হয় না
- **ফিক্স**: Due ব্যাজে overdue হলে "OVERDUE" টেক্সট দেখানো, ডেস্কটপে due date কলামে ছোট overdue ইন্ডিকেটর

### 6. ফিল্টার সিলেক্টের fixed width — মোবাইলে সমস্যা
- `w-[130px]`, `w-[150px]`, `w-[160px]` ছোট স্ক্রিনে কাটা যায়
- **ফিক্স**: মোবাইলে `w-full`, ডেস্কটপে fixed width — responsive class ব্যবহার

### 7. মোবাইলে ফিল্টার বার — অনেক ফিল্টার একসাথে
- ৫টি ফিল্টার wrap হয়ে ৩-৪ লাইন নিচ্ছে
- **ফিক্স**: মোবাইলে ফিল্টারগুলো horizontal scroll বারে রাখা (`overflow-x-auto flex-nowrap`)

## পরিবর্তন

**ফাইল: `src/pages/Invoices.tsx`** — একটি ফাইলে সব ফিক্স

কোনো DB মাইগ্রেশন লাগবে না।

