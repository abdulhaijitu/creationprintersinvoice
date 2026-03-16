
# প্রিন্ট সিস্টেম অডিট — সব পেজে আপডেট

## যেসব সমস্যা পাওয়া গেছে

অডিটে **৪টি কম্পোনেন্ট**-এ সমস্যা পাওয়া গেছে:

| কম্পোনেন্ট | সমস্যা |
|---|---|
| **VendorStatementPDF** | `print-content` ক্লাস নেই, `printStyles.css` ইম্পোর্ট নেই, `onClose` dependency bug আছে |
| **VendorPaymentReceipt** | `print-content` ক্লাস নেই, `printStyles.css` ইম্পোর্ট নেই, PDF filename সেট হচ্ছে না, `onClose` dependency bug |
| **pdfUtils.ts `downloadAsPDF()`** | `setTimeout` দিয়ে title restore — `afterprint` event ব্যবহার করা উচিত (reliable) |
| **Reports.tsx print** | নতুন উইন্ডোতে প্রিন্ট — এটি ঠিকই আছে, কিন্তু inline `handlePrint()` এ filename সেট নেই |

**Invoice ও Quotation Detail** পেজ ইতিমধ্যে `print-content` ক্লাস এবং `downloadAsPDF()` ব্যবহার করছে — সেগুলো ঠিক আছে।

---

## সমাধান

### ১. `src/components/vendor/VendorStatementPDF.tsx`
- `import "@/components/print/printStyles.css"` যোগ
- প্রিন্ট container-এ `print-content` ক্লাস যোগ
- `onCloseRef` pattern ব্যবহার (CustomerStatementPDF-এর মতো)
- dependency থেকে `onClose` সরানো

### ২. `src/components/vendor/VendorPaymentReceipt.tsx`
- `import "@/components/print/printStyles.css"` যোগ
- `import { sanitizeFilename } from "@/lib/pdfUtils"` যোগ
- প্রিন্ট container-এ `print-content` ক্লাস যোগ
- `document.title` সেট করা: `Vendor-Payment-Receipt-VendorName-Date`
- `onCloseRef` pattern ব্যবহার
- dependency থেকে `onClose` সরানো

### ৩. `src/lib/pdfUtils.ts` — `downloadAsPDF()`
- `setTimeout` এর বদলে `afterprint` event ব্যবহার করে title restore করা (বেশি reliable)

### ৪. `src/pages/InvoiceDetail.tsx` ও `src/pages/QuotationDetail.tsx`
- `handlePrint()` ফাংশনে `downloadAsPDF()` কল করা (সরাসরি `window.print()` না করে) — এতে Print বাটনেও সঠিক filename আসবে

**মোট পরিবর্তন: ৫টি ফাইল।**
