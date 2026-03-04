# লাইভ ডিপ্লয়মেন্টের জন্য সিকিউরিটি প্ল্যান

সিকিউরিটি স্ক্যান এবং কোডবেস অডিট থেকে প্রাপ্ত ফলাফলের ভিত্তিতে নিচে সমস্ত ইস্যু এবং সুপারিশ তুলে ধরা হলো।

---

## সনাক্তকৃত সিকিউরিটি ইস্যুসমূহ

### 🔴 ক্রিটিক্যাল (অবিলম্বে ঠিক করা উচিত)

**1. `notification_templates` টেবিলে RLS নেই**

- এই টেবিলে ১৯টি ইমেইল টেমপ্লেট পাবলিকলি পড়া যাচ্ছে। বিজনেস কমিউনিকেশন স্ট্র্যাটেজি, ট্রায়াল পিরিয়ড, প্রাইসিং ইত্যাদি সব এক্সপোজড।
- **ফিক্স**: RLS এনাবল করে শুধু authenticated ইউজারদের জন্য সীমাবদ্ধ করা।

**2. `dangerouslySetInnerHTML` — XSS রিস্ক (৯টি ফাইলে ১১৫+ ইন্সট্যান্স)**

- Invoice details, quotation details, task descriptions, settings — সবখানে ইউজার ইনপুট সরাসরি HTML হিসেবে রেন্ডার হচ্ছে, কোনো sanitization ছাড়া।
- **ফিক্স**: DOMPurify লাইব্রেরি ইনস্টল করে সব `dangerouslySetInnerHTML` এ sanitize করা।

**3. Leaked Password Protection বন্ধ আছে**

- ব্রিচড পাসওয়ার্ড ডিটেকশন অফ আছে। ইউজাররা কমপ্রোমাইজড পাসওয়ার্ড দিয়ে একাউন্ট খুলতে পারছে।
- **ফিক্স**: Authentication সেটিংসে এটি এনাবল করা।

### 🟡 মিডিয়াম রিস্ক

**4. CORS — সব Edge Function এ `Access-Control-Allow-Origin: ***`

- ৩০টি Edge Function এ wildcard CORS হেডার আছে। যেকোনো ওয়েবসাইট থেকে আপনার API কল করা সম্ভব।
- **ফিক্স**: আপনার প্রোডাকশন ডোমেইন (যেমন `creationbms.lovable.app`) সেট করা।

**5. `plan_pricing` ও `plan_limits` টেবিল পাবলিকলি পড়া যাচ্ছে**

- প্রতিযোগীরা আপনার সম্পূর্ণ প্রাইসিং এবং ফিচার লিমিট দেখতে পারছে।
- **ফিক্স**: যদি ইচ্ছাকৃত হয় তবে ডকুমেন্ট করুন, নাহলে authenticated ইউজারদের জন্য RLS যোগ করুন।

**6. `expense_categories` টেবিল পাবলিকলি পড়া যাচ্ছে**

- গ্লোবাল ক্যাটেগরি টেমপ্লেট হিসেবে ব্যবহৃত হলেও, authenticated ইউজারদের মধ্যে সীমাবদ্ধ করা ভালো।

### 🟢 লো রিস্ক / উন্নতির সুযোগ

**7. Database Function Search Path Mutable**

- কিছু ফাংশনে `search_path` সেট নেই, যা schema poisoning রিস্ক তৈরি করতে পারে।

**8. Extension in Public Schema**

- এক্সটেনশন পাবলিক স্কিমায় ইনস্টল আছে। সেপারেট স্কিমায় রাখা নিরাপদ।

---

## ইমপ্লিমেন্টেশন প্ল্যান

### ধাপ ১: Database Migration (RLS ফিক্স)

- `notification_templates` টেবিলে RLS এনাবল + authenticated-only policy যোগ।
- `plan_pricing` ও `plan_limits` এ authenticated-only read policy যোগ (যদি পাবলিক রাখতে না চান)।
- `expense_categories` এ authenticated-only read policy যোগ।

### ধাপ ২: XSS Protection

- `dompurify` প্যাকেজ ইনস্টল।
- একটি `sanitizeHtml()` ইউটিলিটি ফাংশন তৈরি।
- ৯টি ফাইলের সব `dangerouslySetInnerHTML` এ sanitization প্রয়োগ।

### ধাপ ৩: Edge Function CORS Hardening

- একটি শেয়ার্ড `_shared/cors.ts` ফাইল তৈরি করে প্রোডাকশন ডোমেইন সেট।
- ৩০টি Edge Function আপডেট।

---

## কোন ফাইল পরিবর্তন হবে


| ক্যাটেগরি          | ফাইল সংখ্যা        | প্রভাব                        |
| ------------------ | ------------------ | ----------------------------- |
| Database Migration | ১টি SQL            | RLS policies                  |
| XSS Sanitization   | ১০টি ফাইল          | dangerouslySetInnerHTML ফিক্স |
| CORS Hardening     | ৩১টি Edge Function | Origin restrict               |
| &nbsp;             | &nbsp;             | &nbsp;                        |


**UI ডিজাইন বা ফিচারে কোনো পরিবর্তন হবে না।**