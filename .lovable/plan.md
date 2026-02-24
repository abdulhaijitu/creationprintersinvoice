

## Attendance পেইজ — ৪টি ফিচার যোগ করার পরিকল্পনা

নির্বাচিত ফিচার: **1. Monthly Calendar View**, **3. Bulk Attendance Entry**, **6. Mobile Card View**, **8. Design Enhancement**

---

### ফাইল পরিবর্তন

#### 1. নতুন কম্পোনেন্ট: `src/components/attendance/MonthlyCalendarView.tsx`
- মাসভিত্তিক গ্রিড ক্যালেন্ডার (7 কলাম × 4-6 রো)
- প্রতিটি দিনে রঙ-কোডেড ব্যাজ: Present (সবুজ), Absent (লাল), Late (হলুদ), Holiday (নীল), Leave (বেগুনি), Half Day (কমলা)
- মাসের সামারি: Total Working Days, Present, Absent, Late, Total Hours
- Employee ফিল্টার — নির্দিষ্ট কর্মচারীর মাসিক ভিউ অথবা সবার সামারি
- মাস পরিবর্তনের জন্য আগের/পরের মাস বাটন
- ক্যালেন্ডারের প্রতিটি দিনে ক্লিক করলে সেই দিনের attendance details টুলটিপে দেখাবে

#### 2. নতুন কম্পোনেন্ট: `src/components/attendance/BulkAttendanceEntry.tsx`
- Spreadsheet-style টেবিল: বাম কলামে Employee নাম, ডানে Check In ও Check Out ইনপুট
- সব কর্মচারীর জন্য একসাথে সময় এন্ট্রি দেওয়ার সুবিধা
- "Apply to All" বাটন — একটি সময় সবার জন্য কপি করার অপশন
- সেভ বাটনে ক্লিক করলে batch insert/update করবে
- ইতিমধ্যে মার্ক করা কর্মচারীদের আলাদা রঙে দেখাবে (edit mode)
- Validation: প্রতিটি রো-তে সময় ভ্যালিডেশন চেক

#### 3. নতুন কম্পোনেন্ট: `src/components/attendance/AttendanceMobileCard.tsx`
- মোবাইলে টেবিলের বদলে কার্ড লেআউট
- প্রতিটি কার্ডে: Employee নাম, Check In/Out সময়, Duration, Status ব্যাজ
- Admin হলে: inline status change ও overnight toggle
- Swipe-friendly ডিজাইন

#### 4. প্রধান ফাইল পরিবর্তন: `src/pages/Attendance.tsx`

**View Tabs যোগ:**
- তিনটি ট্যাব: "Daily" (বর্তমান ভিউ), "Calendar" (Monthly), "Bulk Entry"
- `Tabs` কম্পোনেন্ট ব্যবহার করে ভিউ সুইচিং

**Design Enhancement:**
- **Header:** আইকনসহ টাইটেল, তারিখ ব্যাজ, এবং attendance rate percentage
- **Summary Cards:** Collapsible করা হবে (Expenses পেইজের মতো), হোভার ইফেক্ট, গ্র্যাডিয়েন্ট আইকন ব্যাকগ্রাউন্ড
- **টেবিল রো কালার কোডিং:** Present রো-তে সূক্ষ্ম সবুজ ব্যাকগ্রাউন্ড, Late-এ হলুদ, Absent-এ লাল
- **Mobile Responsive:** `md:` breakpoint-এ টেবিলের বদলে `AttendanceMobileCard` দেখাবে

---

### টেকনিক্যাল ডিটেইল

```text
Attendance Page Layout (After):
┌─────────────────────────────────────┐
│ Header: Icon + Title + Date Badge   │
│ [Show/Hide Stats] button            │
├─────────────────────────────────────┤
│ Collapsible Summary Cards (4 cards) │
├─────────────────────────────────────┤
│ Tabs: [Daily] [Calendar] [Bulk]     │
├─────────────────────────────────────┤
│ Filters: Date + Employee            │
├─────────────────────────────────────┤
│ Daily Tab:                          │
│   Desktop → Color-coded Table       │
│   Mobile  → AttendanceMobileCard    │
│                                     │
│ Calendar Tab:                       │
│   MonthlyCalendarView (grid)        │
│                                     │
│ Bulk Tab:                           │
│   BulkAttendanceEntry (spreadsheet) │
└─────────────────────────────────────┘
```

**Monthly Calendar Data Fetch:**
- `employee_attendance` টেবিল থেকে পুরো মাসের ডাটা একবারে ফেচ (date range query)
- Weekly holidays `useWeeklyHolidays` থেকে ম্যাপ করা হবে

**Bulk Entry Save Logic:**
- নতুন রেকর্ড → `insert`
- বিদ্যমান রেকর্ড → `update`
- `upsert` ব্যবহার করে একটি কলে সব সেভ হবে

**Mobile Card Breakpoint:**
- `md:hidden` → কার্ড ভিউ দেখাবে
- `hidden md:block` → টেবিল ভিউ দেখাবে

**কোনো ডাটাবেস পরিবর্তন লাগবে না** — বিদ্যমান `employee_attendance` টেবিলই ব্যবহার হবে।

