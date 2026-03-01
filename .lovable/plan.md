

## সকল পেইজ লোডিং ইস্যু — হার্ড পলিশ প্ল্যান

### মূল সমস্যা চিহ্নিতকরণ

নেটওয়ার্ক লগে দেখা যাচ্ছে `organization_members` এবং `organizations` কোয়েরি **20+ বার** রিপিট হচ্ছে প্রতিটি পেইজ লোডে। এটি সকল পেইজের লোডিং ইস্যুর মূল কারণ।

---

### বাগ ১: OrganizationContext — Infinite Fetch Loop (CRITICAL)

**ফাইল:** `src/contexts/OrganizationContext.tsx`

`fetchOrganization` callback-এর dependency array-তে `membership` আছে (লাইন 127)। যখন ফাংশন রান হয়, এটি `setMembership()` কল করে → `membership` পরিবর্তন হয় → `fetchOrganization` recreate হয় → `useEffect` (লাইন 176) আবার ফায়ার হয় `forceRefresh: true` দিয়ে → **অসীম লুপ**।

**ফিক্স:**
- `fetchOrganization` থেকে `membership` dependency সরানো
- `useEffect`-এ `fetchOrganization` dependency সরানো, শুধু `user?.id` এবং `authLoading` রাখা
- প্রথমবার ছাড়া `forceRefresh: true` না পাঠানো

---

### বাগ ২: CompanySettingsContext — ডাবল ফেচ ও ডাবল রিটার্ন

**ফাইল:** `src/contexts/CompanySettingsContext.tsx`

- লাইন 84-85: `refetchSettings` এ `fetchSettings()` **দুইবার** কল হচ্ছে
- লাইন 76-77: `updateSettingsLocally`-এ ডুপ্লিকেট `return updated`

**ফিক্স:**
- ডুপ্লিকেট `fetchSettings()` কল সরানো
- ডুপ্লিকেট `return` সরানো

---

### বাগ ৩: PermissionContext — ডুপ্লিকেট Return

**ফাইল:** `src/contexts/PermissionContext.tsx`

- লাইন 203-204: ডুপ্লিকেট `return;` statement

**ফিক্স:** একটি `return` সরানো

---

### মোট: ৩টি ফাইল পরিবর্তন। সকল পেইজের লোডিং ইস্যু এক সাথে সমাধান হবে।

