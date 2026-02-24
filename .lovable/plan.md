

## সমস্যা

`Settings.tsx` ফাইলের শেষে (line 825-829) `SmsNotificationSettings` এবং `DataExportSection` কম্পোনেন্ট দুটি `<Tabs>` এর **বাইরে** রেন্ডার হচ্ছে। ফলে প্রতিটি ট্যাবে এই দুটি সেকশন দেখা যাচ্ছে।

## সমাধান

| কম্পোনেন্ট | সঠিক স্থান |
|---|---|
| `SmsNotificationSettings` | **Invoice** ট্যাবের ভেতরে (Invoice Settings কার্ডের পরে) |
| `DataExportSection` | **Company** ট্যাবের ভেতরে (Company Information কার্ডের পরে) |

## পরিবর্তন

### ফাইল: `src/pages/Settings.tsx`

1. **Invoice ট্যাবে SMS Notifications সরানো** — `TabsContent value="invoice"` ব্লকের ভেতরে, Invoice Settings কার্ডের পরে `<SmsNotificationSettings isReadOnly={tabPermissions.invoice.isReadOnly} />` যোগ করা হবে।

2. **Company ট্যাবে Data Export সরানো** — `TabsContent value="company"` ব্লকের ভেতরে, Company Information কার্ডের পরে `<DataExportSection />` যোগ করা হবে।

3. **বাইরের রেন্ডার সরিয়ে দেওয়া** — Line 825-829 এর `<SmsNotificationSettings />` এবং `<DataExportSection />` মুছে ফেলা হবে।

এতে প্রতিটি কম্পোনেন্ট শুধুমাত্র তার প্রাসঙ্গিক ট্যাবেই দেখা যাবে।

