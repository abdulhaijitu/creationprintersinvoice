
# ডেট পিকার ক্যালেন্ডার ভুল মাসে ওপেন হওয়ার ফিক্স

## সমস্যা
`DateInput` কম্পোনেন্টে Calendar-এ `defaultMonth` prop দেওয়া নেই। ফলে ক্যালেন্ডার সবসময় আজকের মাসে (April 2026) ওপেন হয়, সিলেক্টেড ডেটের মাসে (August 2026) নয়।

## ফিক্স
`src/components/ui/date-input.tsx` — line 184-এর Calendar কম্পোনেন্টে `defaultMonth` prop যোগ:

```tsx
<Calendar
  mode="single"
  selected={calendarSelected}
  defaultMonth={calendarSelected}   // ← এটি যোগ করতে হবে
  onSelect={handleCalendarSelect}
  disabled={disabledDays}
  initialFocus
  className="pointer-events-auto"
/>
```

এতে ক্যালেন্ডার ওপেন হলে সিলেক্টেড ডেটের মাসে navigate করবে। কোনো ডেট সিলেক্ট না থাকলে আজকের মাস দেখাবে (ডিফল্ট behavior)।

## পরিবর্তন: ১টি ফাইল, ১ লাইন
