

# অন্যান্য পেইজ পারফরম্যান্স অডিট — ফলাফল ও সমাধান

## বিশ্লেষণ সারাংশ

| পেইজ | লাইন | সমস্যা | তীব্রতা |
|-------|-------|--------|---------|
| **Expenses** | 2211 | সবচেয়ে বড় ফাইল, কিন্তু stats useMemo দিয়ে আছে | মাঝারি |
| **Salary** | 1934 | JSX-এর ভিতরে `.filter().length` কল (লাইন 1405) | মাঝারি |
| **Employees** | 1104 | `useMemo` নেই — তবে stats কম্পিউটেশন সাধারণত ছোট | নিম্ন |
| **Attendance** | 825 | **৩টি আলাদা `.filter()` কল** মেমোাইজ ছাড়া (লাইন 449-452) | মাঝারি |
| **Tasks** | 775 | `statusCounts` মেমোাইজ আছে, তবে `activeCount` (লাইন 244) নেই | নিম্ন |
| **Customers** | 1091 | `CSVImportDialog` eagerly loaded | নিম্ন |
| **Vendors** | 687 | `CSVImportDialog` eagerly loaded | নিম্ন |
| **Quotations** | 607 | তুলনামূলক ভালো | নিম্ন |

## প্রধান সমস্যা ও সমাধান

### ১. Attendance — Stats মেমোাইজ করা (তীব্র)
```
// বর্তমান (প্রতি রেন্ডারে ৩x লুপ):
const presentCount = attendance.filter(a => a.status === "present").length;
const absentCount = attendance.filter(a => a.status === "absent").length;
const lateCount = attendance.filter(a => a.status === "late").length;
```
**সমাধান:** `useMemo` দিয়ে একবার লুপে সব গণনা।

### ২. Salary — JSX-এ ফিল্টার সরানো
লাইন 1405: `salaryRecords.filter(r => r.status !== "paid").length` সরাসরি JSX-এ — প্রতি রেন্ডারে চলে।

**সমাধান:** মেমোাইজড ভেরিয়েবলে সরানো।

### ৩. Tasks — `activeCount` মেমোাইজ
লাইন 244 মেমোাইজ ছাড়া আছে — `useMemo`-এ নেওয়া।

### ৪. Customers ও Vendors — CSVImportDialog lazy load
`CSVImportDialog` eagerly import হচ্ছে — `React.lazy` দিয়ে dynamic import করা (Invoices-এর মতো)।

## পরিবর্তনের তালিকা

| ফাইল | পরিবর্তন |
|-------|----------|
| `src/pages/Attendance.tsx` | Stats ৩x `.filter()` → একটি `useMemo` লুপ |
| `src/pages/Salary.tsx` | JSX-এ `.filter().length` → মেমোাইজড ভেরিয়েবল |
| `src/pages/Tasks.tsx` | `activeCount` → `useMemo`-এ যুক্ত |
| `src/pages/Customers.tsx` | `CSVImportDialog` → `React.lazy` |
| `src/pages/Vendors.tsx` | `CSVImportDialog` → `React.lazy` |

**মোট: ৫টি ফাইলে ছোট পরিবর্তন।** কোনো ফিচার বা UI পরিবর্তন হবে না — শুধু রেন্ডার পারফরম্যান্স উন্নত হবে।

