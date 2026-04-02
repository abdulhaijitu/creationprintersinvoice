

# সকল জায়গায় Date Format dd/MM/yyyy ফিক্স

## সমস্যা
Native `<input type="date">` ব্রাউজারের locale অনুযায়ী date দেখায় (কিছু ব্রাউজারে MM/DD/YYYY)। এটা আমাদের নিয়ন্ত্রণে নেই। ফলে ফর্মে এক ফরম্যাট আর টেবিলে অন্য ফরম্যাট দেখায়।

## সমাধান
সব জায়গায় native `<input type="date">` এর বদলে প্রজেক্টে existing `DateInput` কম্পোনেন্ট ব্যবহার করা হবে। `DateInput` ইতিমধ্যে `type="date"` ব্যবহার করে, তাই আমাদের এটাকে আপগ্রেড করতে হবে — একটি **custom text input + calendar popover** pattern এ, যেখানে display সবসময় `dd/MM/yyyy` থাকবে।

## পরিবর্তনসমূহ

### 1. `DateInput` কম্পোনেন্ট আপগ্রেড (`src/components/ui/date-input.tsx`)
- Native `type="date"` বাদ দিয়ে text input + Calendar popover pattern ব্যবহার
- Display সবসময় `dd/MM/yyyy` ফরম্যাটে
- Value internally `yyyy-MM-dd` (DB compatible) রাখবে
- Calendar icon click এ popover calendar ওপেন হবে
- Manual typing support সহ (dd/MM/yyyy ফরম্যাটে)

### 2. সকল ফর্মে `DateInput` ব্যবহার (16টি ফাইল)
যেসব ফাইলে `<Input type="date">` আছে সেগুলোতে `DateInput` দিয়ে replace:
- `InvoiceForm.tsx` — invoice_date, due_date
- `QuotationForm.tsx` — quotation_date, valid_until
- `Expenses.tsx` — bill_date
- `Leave.tsx` — start_date, end_date
- `Attendance.tsx` — selectedDate
- `VendorDetail.tsx` — from/to date, payment_date
- `CreateTaskDialog.tsx` — deadline
- `EditPaymentDialog.tsx` — payment_date
- `PayVendorBillDialog.tsx` — payment_date
- `AddPaymentFromListDialog.tsx`, `AddBillDialog.tsx`, `EditBillDialog.tsx`
- `EnhancedAuditLogsTable.tsx`, `OrgAuditLogViewer.tsx` — date filters
- `CustomerDetail.tsx` — statement dates
- `Payments.tsx` — date filters

### 3. টেবিল display — ইতিমধ্যে dd/MM/yyyy আছে
টেবিলে `format(parseISO(...), 'dd/MM/yyyy')` ব্যবহার হচ্ছে যা সঠিক। কোনো পরিবর্তন দরকার নেই।

## ফলাফল
- ফর্ম ও টেবিল সবখানে **dd/MM/yyyy** দেখাবে
- Internal value সবসময় `yyyy-MM-dd` থাকবে (DB compatible)
- কোনো existing functionality ভাঙবে না

