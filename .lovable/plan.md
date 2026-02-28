

## লোডিং ইস্যু বিশ্লেষণ ও ফিক্স

Session replay দেখায় পেইজ লোড হতে ~5 সেকেন্ড লাগছে। Console-এ Skeleton ref warning আসছে। মূল কারণগুলো:

---

### সমস্যা ১: AuthContext — দুইবার role fetch (Race Condition)
`useEffect`-এ `onAuthStateChange` এবং `getSession` দুটোই একসাথে চলে। দুটোই `fetchUserRole()` কল করে — মানে login/session restore-এ **দুইটি API call** হয়, এবং `setLoading(false)` দুইবার হয়। এতে race condition হতে পারে যেখানে প্রথম call `loading=false` সেট করে কিন্তু role এখনো null।

**Fix:** `getSession` কে primary করা, `onAuthStateChange` তে শুধু পরবর্তী event (sign-in/sign-out) handle করা — initial session-এ duplicate fetch বন্ধ।

### সমস্যা ২: Skeleton component — forwardRef নেই
Console-এ repeated warning: "Function components cannot be given refs." `AuthLoadingShell`-এ Skeleton ব্যবহার হচ্ছে কিন্তু Skeleton `forwardRef` ব্যবহার করে না।

**Fix:** `Skeleton` component-এ `React.forwardRef` যোগ।

### সমস্যা ৩: CompanySettingsContext — Auth/Org wait করে না
`CompanySettingsContext` মাউন্ট হলেই `company_settings` fetch করে — user logged in কিনা বা org আছে কিনা check করে না। Unauthenticated state-এ unnecessary API call হয়।

**Fix:** Auth ready এবং user exist হলেই fetch করা।

---

### Implementation Plan

#### ফাইল ১: `src/contexts/AuthContext.tsx`
- `getSession`-কে primary session source হিসেবে রাখা
- `onAuthStateChange`-এ `INITIAL_SESSION` event ignore করা (duplicate fetch বন্ধ)
- একটি `initialLoadDone` ref ব্যবহার করা

#### ফাইল ২: `src/components/ui/skeleton.tsx`
- `Skeleton` function component-এ `React.forwardRef` যোগ করা (ref warning fix)

#### ফাইল ৩: `src/contexts/CompanySettingsContext.tsx`
- Initial fetch-এ auth state check যোগ (unnecessary unauthenticated fetch বন্ধ)

**মোট: ৩টি ফাইল পরিবর্তন হবে।**

