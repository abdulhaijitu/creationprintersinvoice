

# ইনভয়েস ফিল্টার পারসিস্টেন্স ফিক্স

## সমস্যা
`Invoices` পেজের সব ফিল্টার (`statusFilter`, `searchQuery`, `sortKey`, `sortDirection`, `currentPage`) `useState` দিয়ে ম্যানেজ হচ্ছে। ইনভয়েস ডিটেইলে গিয়ে ব্যাক করলে কম্পোনেন্ট রিমাউন্ট হয়ে সব ফিল্টার রিসেট হয়ে যায়।

## সমাধান
URL search params (`useSearchParams`) ব্যবহার করে ফিল্টার স্টেট URL-এ রাখা হবে। এতে ব্যাক বাটনে ফিল্টার অটো রিস্টোর হবে।

### পরিবর্তন: `src/pages/Invoices.tsx`
- `useSearchParams` ইম্পোর্ট করো (`react-router-dom` থেকে)
- নিচের state গুলো URL params থেকে initialize করো এবং পরিবর্তনে URL আপডেট করো:
  - `statusFilter` → `?status=due`
  - `searchQuery` → `?q=searchterm`
  - `sortKey` → `?sort=total`
  - `sortDirection` → `?dir=asc`
  - `currentPage` → `?page=2`
- `useState` এর বদলে একটি হেল্পার দিয়ে URL params read/write করা হবে
- ইনভয়েস ক্লিক করলে URL params সহ navigate হবে, ব্যাক করলে ব্রাউজার হিস্ট্রি থেকে ফিল্টার ফিরে আসবে

**মোট পরিবর্তন: ১টি ফাইল। UI/ডিজাইনে কোনো পরিবর্তন নেই।**

