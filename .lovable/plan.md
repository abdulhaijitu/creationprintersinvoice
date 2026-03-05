

# Print Statement ফিক্স — ১ম পেজ ফাঁকা সমস্যা

## মূল কারণ
`printStyles.css`-এ `body * { visibility: hidden }` ব্যবহার হচ্ছে। `visibility: hidden` এলিমেন্ট হাইড করে কিন্তু **জায়গা দখল করে রাখে**। CustomerDetail পেজের কার্ড, সাইডবার, হেডার ইত্যাদি invisible কিন্তু তাদের space এখনও আছে — ফলে `.print-content` দ্বিতীয় পেজে চলে যাচ্ছে, প্রথম পেজ ফাঁকা।

## সমাধান

### ১. `src/components/print/printStyles.css` (লাইন 22-33)
`.print-content`-কে `position: absolute; top: 0; left: 0;` করা হবে যাতে hidden elements-এর জায়গা ignore করে পেজের শুরু থেকে রেন্ডার হয়:

```css
.print-content {
    position: absolute !important;
    left: 0;
    top: 0;
    width: 100%;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 0;
    margin: 0;
}
```

### ২. `src/components/customer/CustomerStatementPDF.tsx` (লাইন 202-209)
Inline `padding: 15mm` রিমুভ করা হবে — `@page { margin: 12mm 15mm }` ইতিমধ্যে মার্জিন দিচ্ছে, ডাবল প্যাডিং দরকার নেই।

**মোট পরিবর্তন: ২টি ফাইলে ছোট পরিবর্তন।**

