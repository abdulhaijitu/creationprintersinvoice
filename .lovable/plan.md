

## Customer Save ইস্যু — অডিট ও ফিক্স প্ল্যান

### সমস্যা চিহ্নিতকরণ

**ফাইল:** `src/pages/Customers.tsx` (লাইন 178-207)

`handleSubmit` ফাংশনে কয়েকটি সমস্যা পাওয়া গেছে:

1. **কোনো loading state নেই** — Save বাটনে কোনো disabled/loading indicator নেই, তাই ইউজার বুঝতে পারে না অপারেশন চলছে কিনা
2. **`organization?.id` undefined হতে পারে** — যদি organization context এখনো লোড না হয়ে থাকে, insert-এ `organization_id: undefined` যায় → RLS ব্লক করে → error catch হলেও ইউজার হয়তো toast মিস করে
3. **Empty string ফিল্ড পাঠানো হচ্ছে** — `phone: ''`, `email: ''` ইত্যাদি empty string হিসেবে যাচ্ছে, null হওয়া উচিত (database constraint issue হতে পারে)
4. **Submit বাটনে double-click protection নেই**

### ফিক্স (একটি ফাইল: `src/pages/Customers.tsx`)

**১. Saving state যোগ করা:**
- `const [saving, setSaving] = useState(false)` state যোগ
- `handleSubmit`-এ শুরুতে `setSaving(true)`, finally-তে `setSaving(false)`
- Save বাটনে `disabled={saving}` এবং টেক্সটে "Saving..." দেখানো

**২. Organization guard:**
- Insert-এর আগে `if (!organization?.id)` চেক করে error toast দেখানো ও return

**৩. Empty string → null পরিষ্কার:**
- Insert data তৈরির সময় empty string গুলো null-এ কনভার্ট:
  ```
  phone: formData.phone.trim() || null
  email: formData.email.trim() || null
  // etc.
  ```

**৪. Submit বাটন UI আপডেট:**
- `disabled={saving}` + loading text

### টেকনিক্যাল ডিটেইলস
- RLS-এ দুটি INSERT policy আছে (একটিতে `user_has_active_subscription()` চেক) — OR logic-এ কাজ করে, তাই subscription active থাকলে সমস্যা নেই
- মূল কারণ সম্ভবত `organization?.id` undefined বা empty string fields-এ constraint violation, যা error toast-এ দেখায় কিন্তু ইউজার loading feedback না থাকায় বুঝতে পারে না

