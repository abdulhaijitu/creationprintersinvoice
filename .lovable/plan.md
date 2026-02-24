

## পরিকল্পনা: Invoice Terms & Conditions সেটাপ

### বর্তমান অবস্থা
- Settings → Invoice ট্যাবে `invoice_terms` ফিল্ড **আছে** (plain Textarea)
- কিন্তু InvoiceForm এ `useCompanySettings` ব্যবহার হয় না — তাই নতুন ইনভয়েস তৈরি করলে Settings থেকে Terms **অটো-পপুলেট হয় না**
- শুধু Customer-এর `default_terms` থেকে আসে (যদি সেট করা থাকে)

### যা করা হবে

#### ১. Settings → Invoice ট্যাবে Terms ফিল্ড উন্নত করা
- Plain `Textarea` → **RichTextEditor** এ পরিবর্তন করা (`invoice_terms` এবং `invoice_footer` উভয়ের জন্য)
- এতে বোল্ড, লিস্ট ইত্যাদি ফরম্যাটিং সুবিধা পাওয়া যাবে

#### ২. InvoiceForm এ Company Settings থেকে অটো-পপুলেট
- `useCompanySettings` হুক ইমপোর্ট করা
- নতুন ইনভয়েস তৈরি করার সময় (isEditing = false):
  - `settings.invoice_terms` থাকলে → Terms ফিল্ডে অটো সেট হবে
  - `settings.invoice_footer` থাকলে → Notes ফিল্ডে fallback হিসেবে ব্যবহার হবে (যদি খালি থাকে)
- **Priority চেইন:** Customer default → Company Settings → খালি
- "Reset to company default" বাটন যোগ করা (বর্তমান "Reset to customer default" এর পাশে)

#### ৩. ফাইল পরিবর্তন

| ফাইল | পরিবর্তন |
|------|----------|
| `src/pages/Settings.tsx` | `invoice_terms` ও `invoice_footer` ফিল্ডে `RichTextEditor` ব্যবহার |
| `src/pages/InvoiceForm.tsx` | `useCompanySettings` ইমপোর্ট, নতুন ইনভয়েসে Terms অটো-পপুলেট, "Reset to company default" বাটন |

### Technical Details

**InvoiceForm auto-populate logic (নতুন ইনভয়েস):**
```text
useEffect (isEditing === false):
  if (settings?.invoice_terms && !formData.terms)
    → setFormData({ terms: settings.invoice_terms })
```

**Customer select override:**
```text
handleCustomerChange:
  1. customer.default_terms আছে → customer terms ব্যবহার
  2. customer.default_terms নেই → company settings.invoice_terms রাখা
```

**Reset বাটন priority:**
- Customer default আছে → "Reset to customer default"
- Customer default নেই, Company default আছে → "Reset to company default"

