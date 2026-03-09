
# ডেমো ইউজার Customer Create সমস্যা — ফিক্স

## সমস্যা চিহ্নিত
`md.khaledsaiful605211@gmail.com` ইউজারের role হলো `designer`। কিন্তু `PERMISSION_MATRIX`-এ `designer` role-কে `customers` module-এ কোনো permission দেওয়া হয়নি — `view`, `create`, `edit` কিছুতেই `designer` নেই।

**বর্তমান কোড (`src/lib/permissions/constants.ts` লাইন 213-220):**
```
customers: {
  view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
  create: ['owner', 'manager', 'sales_staff'],
  ...
}
```
`designer` অনুপস্থিত — তাই পেজ লোড হলেও ডাটা দেখা বা তৈরি করা যায় না।

## সমাধান

**ফাইল: `src/lib/permissions/constants.ts`** — `PERMISSION_MATRIX.customers`-এ `designer` role যোগ করা:

- `view` → `designer` যোগ (কাস্টমার দেখতে পারবে)
- `create` → `designer` যোগ (নতুন কাস্টমার তৈরি করতে পারবে)
- `edit` → `designer` যোগ (কাস্টমার এডিট করতে পারবে)

**মোট পরিবর্তন: ১টি ফাইলে ৩ লাইন।**
