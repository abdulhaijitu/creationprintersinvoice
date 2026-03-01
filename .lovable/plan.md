

## Line Items Description-এ Rich Text Editor যোগ করা

### বর্তমান অবস্থা
- ডেস্কটপ টেবিল (লাইন 699-706): সাধারণ `<Input>` ব্যবহার হচ্ছে — single-line plain text
- মোবাইল কার্ড (লাইন 85-89): একই `<Input>` — single-line plain text

### পরিবর্তন

**ফাইল: `src/pages/InvoiceForm.tsx`**

`RichTextEditor` ইম্পোর্ট ইতিমধ্যেই আছে (লাইন 13)।

**১. মোবাইল কার্ড কম্পোনেন্ট (লাইন 83-90)**
- `<Input>` → `<RichTextEditor>` পরিবর্তন
- `minHeight="60px"` দিয়ে কমপ্যাক্ট রাখা

**২. ডেস্কটপ টেবিল (লাইন 698-707)**
- টেবিলের ভেতরের borderless `<Input>` → `<RichTextEditor>` পরিবর্তন
- টেবিলের ভেতরে ফিট করতে কাস্টম styling: `className="border-0 [&>div]:border-0"` এবং `minHeight="40px"`

**৩. মোবাইল কার্ড কম্পোনেন্টের props-এ `RichTextEditor` ইম্পোর্ট অ্যাক্সেস**
- `InvoiceItemCard` কম্পোনেন্ট ফাইলের ভেতরেই আছে, তাই আলাদা ইম্পোর্ট লাগবে না

### কোনো ব্রেকিং চেঞ্জ নেই
- `updateItem` ফাংশন `string | number` accept করে — HTML string সরাসরি কাজ করবে
- ডাটাবেসে description কলাম `text` টাইপ — HTML সংরক্ষণে কোনো সমস্যা নেই
- PDF টেমপ্লেট এবং ডিটেইল ভিউতে ইতিমধ্যে `prose` styling আছে (memory অনুযায়ী)

