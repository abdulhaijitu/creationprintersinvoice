

# ডেট পিকার `defaultMonth` অডিট ও ফিক্স

## সমস্যা
কিছু Calendar কম্পোনেন্টে `defaultMonth` prop নেই, ফলে ক্যালেন্ডার সবসময় আজকের মাসে ওপেন হয় — সিলেক্টেড ডেটের মাসে নয়।

## চিহ্নিত সমস্যা (4টি)

| ফাইল | লাইন | ধরন | সমস্যা |
|---|---|---|---|
| `date-picker.tsx` | 81 | single | `defaultMonth` নেই |
| `Invoices.tsx` | 876 | range | `defaultMonth` নেই |
| `AllBillsTab.tsx` | 288 | range | `defaultMonth` নেই |
| `TableToolbar.tsx` | 156 | range | `defaultMonth` নেই |

## ইতিমধ্যে ঠিক আছে (পরিবর্তন দরকার নেই)
- `date-input.tsx` — আগেই ফিক্স করা হয়েছে ✓
- `CalendarWithJumps` (vendor bill dialogs) — নিজে `displayMonth` state manage করে ✓
- `WeeklyHolidaySettings.tsx` — শুধু display, selection নেই ✓

## ফিক্স

### 1. `src/components/ui/date-picker.tsx` (line 81)
```tsx
// যোগ করতে হবে:
defaultMonth={value}
```

### 2. `src/pages/Invoices.tsx` (line 876)
```tsx
// যোগ করতে হবে:
defaultMonth={dateFrom ? parseISO(dateFrom) : undefined}
```

### 3. `src/components/vendor/AllBillsTab.tsx` (line 288)
```tsx
// যোগ করতে হবে:
defaultMonth={dateRange?.from}
```

### 4. `src/components/shared/TableToolbar.tsx` (line 156)
```tsx
// যোগ করতে হবে:
defaultMonth={dateRange?.from}
```

## মোট পরিবর্তন: 4টি ফাইল, প্রতিটিতে 1 লাইন যোগ

