

# Vendor পেইজ রিলোডে Skeleton আটকে যাওয়ার সমস্যা — ফিক্স

## Root Cause

হার্ড রিলোডে এই sequence ঘটে:

1. **AuthContext**: `getSession()` localStorage থেকে ক্যাশড (সম্ভবত expired) JWT পায় → `user` সেট করে → `loading=false`
2. **OrganizationContext**: `!authLoading && user` true হওয়ায় `fetchOrganization()` কল করে
3. **Supabase RLS**: এই সময় JWT expired/not-yet-refreshed থাকে → `auth.uid()` null → `organization_members` query empty ফেরত দেয়
4. **OrganizationContext** (line 101-104): `membershipRows.length === 0` → `loading=false` করে, কিন্তু `organization` null থাকে
5. **Token refresh** ঘটে (`onAuthStateChange` → `TOKEN_REFRESHED`) কিন্তু `user.id` একই থাকে → OrgContext এর effect **আবার fire হয় না**
6. **Vendors page**: `enabled: !!organization?.id` → false → query disabled → skeleton আটকে থাকে

দ্বিতীয় রিফ্রেশে token ইতিমধ্যে refreshed থাকে, তাই কাজ করে।

## সমাধান

**ফাইল: `src/contexts/OrganizationContext.tsx`**

OrganizationContext-এ দুটি পরিবর্তন:

### ১. Auth state change listener যোগ
`onAuthStateChange` subscribe করে `TOKEN_REFRESHED` event-এ `fetchOrganization(true)` কল করা — যাতে token refresh হওয়ার পর organization আবার fetch হয়।

### ২. Empty membership-তে retry
যখন authenticated user-এর জন্য membership empty আসে, একটি delayed retry (1 সেকেন্ড পর) schedule করা — যাতে token refresh-এর পর আবার চেষ্টা হয়।

### পরিবর্তনের সারসংক্ষেপ

```text
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event) => {
      if (event === 'TOKEN_REFRESHED' && !organization && user) {
        fetchOrganization(true);
      }
    }
  );
  return () => subscription.unsubscribe();
}, [user, organization, fetchOrganization]);
```

এবং `fetchOrganization` এর মধ্যে empty membership পাওয়ার পরে:
```text
if (!membershipRows || membershipRows.length === 0) {
  setLoading(false);
  // Retry once after delay — token may still be refreshing
  if (!retryScheduled.current) {
    retryScheduled.current = true;
    setTimeout(() => {
      retryScheduled.current = false;
      fetchOrganization(true);
    }, 1500);
  }
  return;
}
```

**মোট: ১টি ফাইলে পরিবর্তন। কোনো DB মাইগ্রেশন লাগবে না।**

