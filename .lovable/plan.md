

# Invoice ডেট রিলেটেড অডিট ও ফিক্স

## চিহ্নিত সমস্যা

### Issue 1: `new Date()` ব্যবহার — timezone shift/off-by-one-day ঝুঁকি
প্রজেক্ট স্ট্যান্ডার্ড অনুযায়ী `parseISO()` ব্যবহার করতে হবে, কিন্তু কিছু জায়গায় `new Date(dateString)` ব্যবহৃত:

| ফাইল | লাইন | সমস্যা |
|---|---|---|
| `InvoiceDetail.tsx` | 613 | `new Date(payment.payment_date)` |
| `InvoiceDetail.tsx` | 636 | `new Date(payment.created_at)` |
| `InvoicePaymentSummary.tsx` | 65 | `new Date(invoice.due_date)` overdue check |
| `InvoicePaymentSummary.tsx` | 153 | `new Date(invoice.due_date)` display |
| `InvoicePaymentSummary.tsx` | 239 | `new Date(payment.payment_date)` |

### Issue 2: Inconsistent date display format
Due date `MMMM d, yyyy` (e.g. "April 2, 2026") ব্যবহৃত — প্রজেক্ট স্ট্যান্ডার্ড `dd/MM/yyyy`:

| ফাইল | লাইন | বর্তমান | ফিক্স |
|---|---|---|---|
| `InvoicePaymentSummary.tsx` | 153 | `'MMMM d, yyyy'` | `'dd/MM/yyyy'` |
| `InvoiceDetail.tsx` | 613 | `'dd MMM yyyy'` | `'dd/MM/yyyy'` |

### Issue 3: `toLocaleDateString()` — browser-dependent format
| ফাইল | লাইন | সমস্যা |
|---|---|---|
| `InvoiceNumberSettings.tsx` | 269 | `new Date(...).toLocaleDateString()` |

## ফিক্স তালিকা (5 ফাইল)

### 1. `src/pages/InvoiceDetail.tsx`
- Line 613: `new Date(payment.payment_date)` → `parseISO(payment.payment_date)`, format `'dd/MM/yyyy'`
- Line 636: `new Date(payment.created_at)` → `parseISO(payment.created_at)`

### 2. `src/components/invoice/InvoicePaymentSummary.tsx`
- Line 65: `new Date(invoice.due_date) < new Date()` → `parseISO(invoice.due_date)` comparison
- Line 153: `format(new Date(invoice.due_date), 'MMMM d, yyyy')` → `format(parseISO(invoice.due_date), 'dd/MM/yyyy')`
- Line 239: `new Date(payment.payment_date)` → `parseISO(payment.payment_date)`
- Import `parseISO` from date-fns

### 3. `src/components/settings/InvoiceNumberSettings.tsx`
- Line 269: `new Date(sequence.last_migration_at).toLocaleDateString()` → `format(parseISO(sequence.last_migration_at), 'dd/MM/yyyy')`
- Add `format, parseISO` import

### Already correct (no change needed):
- `Invoices.tsx` — table display, export, sort সব `parseISO` + `dd/MM/yyyy` ব্যবহার করছে ✓
- `InvoicePDFTemplate.tsx` — `parseISO` + `dd/MM/yyyy` ✓
- `InvoiceForm.tsx` — `DateInput` component ব্যবহার করছে ✓
- `AddPaymentDialog.tsx` — `DateInput` ব্যবহার করছে ✓

## মোট পরিবর্তন: 3টি ফাইল
- সব `new Date(dateString)` → `parseISO(dateString)`
- সব date format → `dd/MM/yyyy` (consistent)
- `toLocaleDateString()` → `format(parseISO(...), 'dd/MM/yyyy')`

