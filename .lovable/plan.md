

# Loading ইস্যু অডিট ও ফিক্স

## সমস্যা চিহ্নিত
অ্যাপে ৩ ধরনের loading inconsistency আছে:

1. **Plain "Loading..." text** — ৮টি কম্পোনেন্টে `<p>Loading...</p>` ব্যবহৃত (project standard: Skeleton/Spinner)
2. **Raw CSS spinner** — ৪টি কম্পোনেন্টে `border-b-2 border-primary animate-spin` div (standard: `Loader2` icon বা Skeleton)
3. **Missing Skeleton in drawers/panels** — কিছু drawer/panel content-এ loading state নেই বা plain text

## ফিক্স তালিকা

### Group A: "Loading..." → Skeleton/Spinner (8 files)

| ফাইল | বর্তমান | ফিক্স |
|---|---|---|
| `ApprovalsPanel.tsx` (ln 73) | `<p>Loading...</p>` | `<Skeleton>` bars (3 rows) |
| `EntityAttachmentsSection.tsx` (ln 86) | `<p>Loading...</p>` | `<Skeleton>` bars (2 rows) |
| `NotificationBell.tsx` (ln 134) | `<span>Loading...</span>` | `<Loader2 className="animate-spin">` centered |
| `ChallanDetailDrawer.tsx` (ln 143) | `'Loading...'` text in title | `<Skeleton className="h-5 w-32">` |
| `ChallanPrintTemplate.tsx` (ln 96) | `<p>Loading...</p>` | `<Loader2>` spinner (inline style context, keep simple) |
| `ReferenceSelect.tsx` (ln 219) | `'Loading...'` in CommandEmpty | `<Loader2>` spinner + "Searching..." |
| `ReferenceSelect.tsx` (ln 331) | `<span>Loading...</span>` | `<Skeleton className="h-4 w-24">` |

### Group B: Raw CSS spinner → Loader2 icon (4 files)

| ফাইল | ফিক্স |
|---|---|
| `AuditLogsTable.tsx` (ln 123) | `<Loader2 className="h-6 w-6 animate-spin text-primary">` |
| `EnhancedAuditLogsTable.tsx` (ln 281) | `<Loader2 className="h-8 w-8 animate-spin text-primary">` |
| `OrganizationDetailsDrawer.tsx` (ln 683) | `<Loader2 className="h-6 w-6 animate-spin text-primary">` |

*(Print templates — CustomerStatementPDF, VendorStatementPDF, VendorPaymentReceipt — এগুলো print overlay, সেগুলো ঠিক আছে)*

### Group C: Print overlays (3 files — ঠিক আছে, skip)
`CustomerStatementPDF`, `VendorStatementPDF`, `VendorPaymentReceipt` — এগুলো full-screen print preparation overlay, spinner + descriptive text সঠিক।

## মোট পরিবর্তন: ~10টি ফাইল
- Plain `Loading...` → Skeleton বা Loader2 spinner
- Raw CSS `div` spinner → `Loader2` icon component
- কোনো logic বা data flow পরিবর্তন নেই

