

# সব ডেট পিকারে সাল জাম্প (Month/Year Select) যোগ

## পরিকল্পনা
অ্যাপে ইতিমধ্যে `CalendarWithJumps` কম্পোনেন্ট আছে যেটাতে month ও year dropdown select আছে। এখন যেসব জায়গায় সাধারণ `Calendar` ব্যবহার হচ্ছে সেখানে `CalendarWithJumps` দিয়ে replace করতে হবে।

## পরিবর্তন (4টি ফাইল)

### 1. `src/components/ui/date-input.tsx`
- Import `CalendarWithJumps` instead of `Calendar`
- Line 184: `<Calendar>` → `<CalendarWithJumps fromYear={2020} toYear={2035}>`

### 2. `src/components/ui/date-picker.tsx`
- Import `CalendarWithJumps` instead of `Calendar`
- Line 81: `<Calendar>` → `<CalendarWithJumps fromYear={2020} toYear={2035}>`

### 3. `src/components/shared/TableToolbar.tsx`
- Import `CalendarWithJumps` instead of `Calendar`
- Line 156: `<Calendar>` → `<CalendarWithJumps fromYear={2020} toYear={2035}>`

### 4. `src/components/vendor/AllBillsTab.tsx`
- Import `CalendarWithJumps` instead of `Calendar`
- Line 288: `<Calendar>` → `<CalendarWithJumps fromYear={2020} toYear={2035}>`

## ইতিমধ্যে ঠিক আছে
- `AddBillDialog.tsx` ও `EditBillDialog.tsx` — আগে থেকেই `CalendarWithJumps` ব্যবহার করছে ✓

## ফলাফল
সব ডেট পিকারে month ও year dropdown select থাকবে — সরাসরি যেকোনো সালে জাম্প করা যাবে।

