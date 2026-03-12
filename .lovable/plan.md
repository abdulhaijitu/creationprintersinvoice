

# SaaS ফিচার রিমুভ — পরিকল্পনা

## যা রিমুভ হবে

### Admin Panel থেকে সেকশন রিমুভ:
- **Plan Presets** — `plan-presets` সেকশন ও `PlanPermissionPresetsManager` কম্পোনেন্ট
- **Plan Limits** — `plan-limits` সেকশন
- **Upgrade Requests** — `upgrade-requests` সেকশন ও `UpgradeRequestsManager` কম্পোনেন্ট
- **Billing** — `billing` সেকশন
- **Investor Metrics** — `investor` সেকশন ও `InvestorDashboard` কম্পোনেন্ট

### কম্পোনেন্ট রিমুভ/ক্লিন:
- `src/components/admin/InvestorDashboard.tsx` — ডিলিট
- `src/components/admin/UpgradeRequestsManager.tsx` — ডিলিট
- `src/components/admin/PlanPermissionPresetsManager.tsx` — ডিলিট
- `src/components/admin/UsageLimitCard.tsx` — ডিলিট
- `src/components/billing/UnpaidInvoiceBanner.tsx` — ডিলিট
- `src/components/billing/GenerateInvoiceDialog.tsx` — ডিলিট
- `src/components/billing/MarkPaidDialog.tsx` — ডিলিট
- `src/components/invoice/PayNowButton.tsx` — ডিলিট (UddoktaPay SaaS payment)

### Hooks রিমুভ:
- `src/hooks/useInvestorMetrics.ts` — ডিলিট
- `src/hooks/useUpgradeRequests.ts` — ডিলিট
- `src/hooks/useBillingInvoices.ts` — ডিলিট
- `src/hooks/useUddoktaPay.ts` — ডিলিট

### Edge Functions রিমুভ:
- `supabase/functions/change-organization-plan/` — ডিলিট
- `supabase/functions/request-plan-upgrade/` — ডিলিট
- `supabase/functions/handle-upgrade-request/` — ডিলিট
- `supabase/functions/uddoktapay-initiate/` — ডিলিট
- `supabase/functions/uddoktapay-verify/` — ডিলিট
- `supabase/functions/uddoktapay-webhook/` — ডিলিট

### ফাইল এডিট (রেফারেন্স ক্লিন):
| ফাইল | পরিবর্তন |
|-------|----------|
| `src/pages/Admin.tsx` | SaaS সেকশন ও lazy imports রিমুভ |
| `src/components/admin/AdminSidebar.tsx` | plan-presets, plan-limits, billing, upgrade-requests, investor nav items রিমুভ |
| `src/components/admin/AdminMobileTiles.tsx` | একই nav items রিমুভ |
| `src/components/admin/AdminCommandPalette.tsx` | investor command রিমুভ |
| `src/lib/adminPermissions.ts` | SaaS সেকশন রেফারেন্স রিমুভ |
| `src/components/admin/OrganizationDetailsDrawer.tsx` | UsageLimitCard রেফারেন্স রিমুভ |
| `src/hooks/useEnhancedAudit.ts` | `logSubscriptionAction` ও `logBillingAction` রিমুভ |

## যা থাকবে (SaaS নয়)
- Organizations, Users, Role Permissions — এগুলো multi-tenancy ম্যানেজমেন্ট, SaaS billing নয়
- Subscriptions টেবিল ডাটাবেসে থাকবে (ডাটা হারানো এড়াতে) তবে UI থেকে SaaS ফিচার সরানো হবে
- Admin Dashboard, Analytics, Notifications, Audit Logs — এগুলো প্ল্যাটফর্ম ম্যানেজমেন্ট

## মোট: ~18টি ফাইল ডিলিট, ~7টি ফাইল এডিট

