

## Responsive, Mobile Optimization & Speed — বিশ্লেষণ ও পরিকল্পনা

---

### চিহ্নিত সমস্যাসমূহ

#### ১. Speed: অতিরিক্ত Font Loading (Critical)
`index.css`-এ **4টি Google Fonts @import** আছে (লাইন 1-5):
- Inter, Hind Siliguri, Roboto, Libre Caslon Text, Roboto Mono
- এগুলো **render-blocking** — পেইজ লোড হওয়ার আগে সব font download হতে হবে
- `Libre Caslon Text` ও `Roboto Mono` কোথাও ব্যবহার হচ্ছে না (শুধু CSS variable define আছে, কোনো component-এ সরাসরি ব্যবহার নেই)

**Fix:** অব্যবহৃত font import সরানো, বাকি font-গুলো `<link rel="preconnect">` + `<link rel="stylesheet">` দিয়ে `index.html`-এ move করা (non-blocking), এবং `font-display: swap` ensure করা

#### ২. Speed: `App.css` Dead Code
`src/App.css` ফাইলটি Vite scaffold-এর default CSS — কোথাও import হচ্ছে না কিন্তু build-এ include হচ্ছে। `#root` selector-এ `max-width: 1280px`, `padding: 2rem`, `text-align: center` — এগুলো app layout-কে conflict করতে পারে।

**Fix:** `src/App.css` ফাইল delete করা

#### ৩. Speed: Dashboard পেইজে `useEffect` দিয়ে 6টি parallel query
Dashboard `useEffect` + `Promise.all` ব্যবহার করে data fetch করে — React Query ব্যবহার করে না। ফলে:
- Window focus-এ re-fetch হয় না (inconsistent)
- Cache হয় না, প্রতিটি visit-এ নতুন করে fetch
- Loading state flicker হয়

**Fix:** `useQuery` দিয়ে migrate করা `queryKeys.dashboardStats` ব্যবহার করে, যা already define করা আছে `useQueryConfig.ts`-এ

#### ৪. Mobile: Bottom Nav bar content overlap
MobileBottomNav `fixed bottom-0` কিন্তু main content area-তে `pb-6` — bottom nav height ~64px, তাই content bottom nav-এর নিচে চলে যায়। মোবাইলে শেষের content bottom nav-এর পেছনে লুকিয়ে যায়।

**Fix:** AppLayout-এ মোবাইলে `pb-20` (bottom nav height + safe area) যোগ করা

#### ৫. Mobile: Login/Register পেইজ viewport issue
`user-scalable=no` আছে `index.html`-এ — accessibility violation। Pinch-to-zoom disable করা WCAG 2.1 violation।

**Fix:** `user-scalable=no` সরানো, `maximum-scale=5` রাখা

#### ৬. Speed: AuthContext `setTimeout(100ms)` delay
`AuthContext.tsx` লাইন 62: role fetch-এ `setTimeout(..., 100)` ব্যবহার করে — প্রতিটি login/session restore-এ 100ms artificial delay। এটি unnecessary কারণ `onAuthStateChange` already session ready হওয়ার পরে fire করে।

**Fix:** `setTimeout` সরিয়ে সরাসরি `await fetchUserRole()` করা

---

### Implementation Plan

#### ফাইল ১: `src/index.css`
- লাইন 3-5: অব্যবহৃত font imports সরানো (`Libre Caslon Text`, `Roboto Mono`)
- লাইন 1-2: `@import url(...)` সরিয়ে `index.html`-এ `<link>` tag-এ move

#### ফাইল ২: `index.html`
- `<head>`-এ `<link rel="preconnect" href="https://fonts.googleapis.com">` এবং `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` যোগ
- Font stylesheet `<link>` tag যোগ (Inter, Hind Siliguri, Roboto — display=swap)
- `user-scalable=no` → `user-scalable=yes` এবং `maximum-scale=5`

#### ফাইল ৩: `src/App.css`
- ফাইল delete (কোথাও import হচ্ছে না, dead code)

#### ফাইল ৪: `src/components/layout/AppLayout.tsx`
- Main content-এ মোবাইলে `pb-20` যোগ (bottom nav overlap fix)

#### ফাইল ৫: `src/contexts/AuthContext.tsx`
- লাইন 62: `setTimeout` সরিয়ে direct `await fetchUserRole()` করা

#### ফাইল ৬: `src/pages/Dashboard.tsx`
- `useEffect` + `Promise.all` → `useQuery` migrate করা (cache + stale-while-revalidate)

**মোট: ৬টি ফাইল পরিবর্তন হবে।**

