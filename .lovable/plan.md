

# কাস্টমার স্টেটমেন্ট প্রিন্ট ফিক্স

## সমস্যা
`CustomerStatementPDF` কম্পোনেন্ট `hidden print:block` ব্যবহার করে, কিন্তু বাকি পেজের এলিমেন্ট (কার্ড, সাইডবার, হেডার ইত্যাদি) প্রিন্টে হাইড হচ্ছে না। `printStyles.css` এর `body * { visibility: hidden }` ও `.print-content { visibility: visible }` সিস্টেম আছে, কিন্তু স্টেটমেন্ট কম্পোনেন্ট `.print-content` ক্লাস ব্যবহার করে না।

## সমাধান: `src/components/customer/CustomerStatementPDF.tsx`

স্টেটমেন্টের প্রিন্ট `div`-এ `print-content` ক্লাস যোগ করো এবং `printStyles.css` ইম্পোর্ট করো:

1. ফাইলের উপরে `import "@/components/print/printStyles.css"` যোগ করো
2. প্রিন্ট `div`-এ ক্লাস পরিবর্তন:
   ```tsx
   // আগে:
   className="hidden print:block bg-white text-black"
   // পরে:
   className="hidden print:block print-content bg-white text-black"
   ```

**মোট পরিবর্তন: ১টি ফাইলে ২ লাইন।**

