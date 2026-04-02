

# Invoice Date Problem — Audit & Fix Plan

## সমস্যা (Problem)
`new Date("2026-04-01")` JavaScript-এ **UTC midnight** হিসেবে parse হয়। `date-fns` এর `format()` **local timezone** ব্যবহার করে। ফলে UTC-এর পেছনের timezone-এ তারিখ ১ দিন পিছিয়ে দেখায়। এমনকি UTC+ timezone (যেমন Dhaka) এও এটি fragile এবং inconsistent।

**সমাধান:** সব জায়গায় `new Date(dateString)` এর বদলে `parseISO(dateString)` ব্যবহার করতে হবে। `date-fns` এর `parseISO` date-only string কে **local midnight** হিসেবে parse করে, ফলে timezone shift হয় না।

## পরিবর্তন

### 1. Invoice Table (Invoices.tsx)
- Line 466-467, 548, 1095, 1223: `new Date(invoice.invoice_date)` → `parseISO(invoice.invoice_date)`
- `parseISO` already imported

### 2. Invoice Form (InvoiceForm.tsx)
- Edit mode-এ `invoice.invoice_date` সরাসরি `formData`-তে set হয় — এটা ঠিক আছে (native `<input type="date">` expects `yyyy-MM-dd`)
- No changes needed here

### 3. Invoice Detail (InvoiceDetail.tsx)
- Line 309, 422: `new Date(invoice.invoice_date)` → `parseISO(invoice.invoice_date)`
- Line 364, 396, 399: `due_date` formatting-ও fix
- `parseISO` import যোগ

### 4. Invoice Mobile Card (InvoiceCard.tsx)
- Line 89: `new Date(invoice.invoice_date)` → `parseISO(invoice.invoice_date)`
- `parseISO` import যোগ

### 5. Customer Detail (CustomerDetail.tsx)
- Line 363, 396, 399: invoice_date ও due_date fix
- `parseISO` import যোগ

### 6. PDF Templates
- `InvoicePDFTemplate.tsx` line 417: fix
- `QuotationPDFTemplate.tsx` line 476: fix

### 7. Other affected pages (same pattern)
- `Expenses.tsx`, `Quotations.tsx`, `Payments.tsx` — date display lines-এ same fix
- `BusinessAnalyticsDashboard.tsx` — due_date comparison fix

## কোনো Breaking Change নেই
- `parseISO` already used in several files
- শুধু `new Date(dateOnlyString)` → `parseISO(dateOnlyString)` replace
- Sorting, filtering, form data — কোনো কিছু ভাঙবে না

