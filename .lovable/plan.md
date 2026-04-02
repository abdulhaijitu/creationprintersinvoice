

# Invoice Date ডিফল্ট ভ্যালু রিমুভ

## সমস্যা
`InvoiceForm.tsx` এ line 147-তে `invoice_date` এর ডিফল্ট ভ্যালু `format(new Date(), 'yyyy-MM-dd')` সেট করা আছে, ফলে নতুন ইনভয়েস তৈরি করলে আজকের তারিখ automatically দেখায়।

## ফিক্স
`src/pages/InvoiceForm.tsx` — line 147:
```
// আগে:
invoice_date: format(new Date(), 'yyyy-MM-dd'),

// পরে:
invoice_date: '',
```

এতে New Invoice-এ date field ফাঁকা থাকবে এবং ইউজারকে নিজে ডেট সিলেক্ট করতে হবে। Edit Invoice-তে কোনো প্রভাব পড়বে না কারণ সেখানে DB থেকে আসা ভ্যালু সেট হয়।

