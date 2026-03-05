

# Print Statement PDF ফাইলনেম ফিক্স

## সমস্যা
PDF সেভ করলে নাম আসে "Creation Invoicing - Lovable.pdf"। কোডে `document.title` সেট করা আছে কিন্তু Lovable preview iframe-এর ভেতরে `document.title` পরিবর্তন করলে ব্রাউজার parent frame-এর title ব্যবহার করে PDF filename হিসেবে।

## বিশ্লেষণ
- `CustomerStatementPDF.tsx` লাইন 164-187-এ `document.title = filename` সেট করা হচ্ছে
- কিন্তু Lovable preview iframe-এ এটি কাজ করে না কারণ ব্রাউজার top-level document-এর title নেয়
- Published URL-এ (`creationbms.lovable.app`) এটি সঠিকভাবে কাজ করার কথা
- তবে নিশ্চিত করতে কোড আরো robust করা দরকার

## সমাধান: `src/components/customer/CustomerStatementPDF.tsx`

### ১. `onClose` dependency সমস্যা ফিক্স
`useEffect`-এর dependency array-তে `onClose` আছে। যেহেতু `onClose` হলো `() => setShowStatement(false)` — এটি প্রতি রেন্ডারে নতুন reference তৈরি করে, ফলে effect re-run হয় এবং title restore হয়ে যেতে পারে print dialog দেখানোর আগেই।

**ফিক্স:** `onClose`-কে `useRef`-এ রাখা এবং dependency থেকে সরানো:

```tsx
const onCloseRef = useRef(onClose);
onCloseRef.current = onClose;

useEffect(() => {
  const customerNameSafe = sanitizeFilename(customer.name);
  const periodStr = format(new Date(), "yyyy-MM");
  const filename = `Customer-Statement-${customerNameSafe}-${periodStr}`;

  const originalTitle = document.title;
  document.title = filename;

  const timer = setTimeout(() => {
    window.print();
  }, 500);

  const handleAfterPrint = () => {
    document.title = originalTitle;
    onCloseRef.current();
  };
  window.addEventListener("afterprint", handleAfterPrint);

  return () => {
    clearTimeout(timer);
    document.title = originalTitle;
    window.removeEventListener("afterprint", handleAfterPrint);
  };
}, [customer.name]); // onClose সরানো হলো
```

**মোট পরিবর্তন: ১টি ফাইলে ছোট পরিবর্তন।**

> **দ্রষ্টব্য:** Preview mode-এ (iframe-এর ভেতরে) ব্রাউজার parent page-এর title ব্যবহার করতে পারে — এটি Lovable preview-এর limitation। Published সাইটে (`creationbms.lovable.app`) সঠিক filename আসবে।

