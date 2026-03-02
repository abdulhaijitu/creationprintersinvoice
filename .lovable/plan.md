

## স্কেলেটন লোডিং সমস্যার মূল কারণ ও সমাধান প্ল্যান

### মূল কারণ চিহ্নিত

সমস্যাটি **ডেটা ফেচিং ওয়াটারফল চেইন** থেকে আসছে:

```text
AuthContext (loading=true)          ← ব্লকিং পয়েন্ট ১
  → OrganizationContext (loading=true)  ← ব্লকিং পয়েন্ট ২  
    → PermissionContext (loading=true)    ← ব্লকিং পয়েন্ট ৩
      → Page useQuery (enabled: !!org?.id)  ← ব্লকিং পয়েন্ট ৪
```

প্রতিটি স্তর আগেরটি শেষ না হওয়া পর্যন্ত অপেক্ষা করে। মোট ৪টি sequential নেটওয়ার্ক কল হয় পেজ কন্টেন্ট দেখানোর আগে।

এছাড়া **`usePayments` হুক** এখনো raw `useEffect` + `setLoading(true)` প্যাটার্ন ব্যবহার করে — প্রতিবার ফুল রিফেচ, কোনো ক্যাশ নেই।

### সমাধান (৩টি ফাইল)

**১. `src/contexts/OrganizationContext.tsx`** — ওয়াটারফল ভাঙা
- `loading` ইনিশিয়ালি `true` থাকে এবং auth শেষ হওয়ার পরও org fetch চলাকালীন `true` থাকে
- **ফিক্স:** `loading: loading || authLoading` থেকে পরিবর্তন করে শুধু `loading` রাখা — AppLayout ইতিমধ্যে `authLoading` আলাদাভাবে চেক করে
- `loading` ডিফল্ট `false` করা যখন user নেই (line 58: `useState(true)` → auth ready হলে তখনই `true`)
- PermissionContext-এও একই — org ready হওয়ার আগেই owner/superadmin-দের জন্য ইন্সট্যান্ট `permissionsReady=true`

**২. `src/hooks/usePayments.ts`** — useQuery মাইগ্রেশন
- `useEffect` + `fetchPayments` + `setLoading(true)` → `useQuery` দিয়ে রিপ্লেস
- ক্যাশড নেভিগেশন, loading flash দূর
- `refetch` ফাংশন `queryClient.invalidateQueries` দিয়ে রিটার্ন

**৩. `src/contexts/PermissionContext.tsx`** — Owner/SuperAdmin দের জন্য instant ready
- Super Admin এবং Owner-দের জন্য কোনো DB fetch লাগে না — এরা সব permission পায়
- **ফিক্স:** `fetchPermissions` dependency-তে `orgLoading` চেক সরিয়ে, owner/superadmin হলে `setLoading(false)` + `setPermissionsReady(true)` ইন্সট্যান্ট করা — DB call ছাড়াই
- এটি ইতিমধ্যে কোডে আছে (line 189-203) কিন্তু `orgLoading` true থাকায় `fetchPermissions` কল হয় না যতক্ষণ না org fully loaded

### সারাংশ

| ফাইল | পরিবর্তন | ইমপ্যাক্ট |
|------|-----------|-----------|
| OrganizationContext.tsx | loading chain decouple | ওয়াটারফল কমানো |
| PermissionContext.tsx | Owner/Admin instant ready | Skeleton ফ্ল্যাশ দূর |
| usePayments.ts | useQuery মাইগ্রেশন | Payments পেজ ক্যাশড |

UI অপরিবর্তিত। কোনো ফিচার রিমুভ নয়।

