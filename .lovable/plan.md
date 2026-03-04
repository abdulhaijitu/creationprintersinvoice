

# Production Readiness Audit — Final Fixes

## Issues Found

### 1. Context Hook Crash Risk (CRITICAL)
Same pattern that crashed `CompanySettingsContext` exists in 4 other contexts. If any provider fails to mount (race condition, HMR glitch), the `throw new Error` in these hooks will crash the entire app with a blank screen:
- `useAuth` in `AuthContext.tsx` (line 155)
- `useOrganization` in `OrganizationContext.tsx` (line 221)
- `usePermissionContext` in `PermissionContext.tsx` (line 568)
- `useImpersonation` in `ImpersonationContext.tsx` (line 325)

**Fix**: Apply the same fallback pattern used for `useCompanySettings` — return a safe default context instead of throwing. This ensures no single context failure can white-screen the app.

### 2. Tooltip Ref Warning in Quotations Page (MINOR)
Console warning: "Function components cannot be given refs" in `Quotations.tsx` at the disabled delete button Tooltip (line 532). The `Tooltip` component is being used correctly with `asChild` on `TooltipTrigger`, but the warning suggests a component mismatch. This is cosmetic but should be cleaned up for production logs.

**Fix**: Ensure `TooltipTrigger` wraps a proper DOM element (the `<span>` wrapper is already there — this is likely a Radix version quirk). No action needed unless it causes functional issues.

### 3. 266 `select('*')` Queries Across 38 Files (PERFORMANCE)
Despite the "no SELECT *" guideline, 266 instances remain. This is a large-scope change that should be addressed incrementally post-launch rather than in this fix batch. Not blocking for launch.

### 4. Console.log Statements in Production Code (CLEANUP)
Several `console.log` statements in contexts (`AppContext`, `PermissionContext`, `ImpersonationContext`) and pages (`Employees`, `Settings`). These should be removed or gated behind dev mode for clean production logs.

**Fix**: Remove or wrap in `import.meta.env.DEV` checks.

---

## Implementation Plan

### File Changes

**1. `src/contexts/OrganizationContext.tsx`** (line 218-223)
- Replace `throw new Error` with fallback context return (loading: true, null org)

**2. `src/contexts/PermissionContext.tsx`** (line 565-571)  
- Replace `throw new Error` with fallback context return (loading: true, empty permissions)

**3. `src/contexts/ImpersonationContext.tsx`** (line 323-327)
- Replace `throw new Error` with fallback context return (not impersonating)

**4. `src/contexts/AuthContext.tsx`** (line 152-157)
- Replace `throw new Error` with fallback context return (loading: true, null user)

**5. `src/contexts/AppContext.tsx`** (line 219-223)
- Replace `throw new Error` with fallback context return

**6. Console.log cleanup** in:
- `src/contexts/AppContext.tsx` — remove debug logs
- `src/contexts/PermissionContext.tsx` — remove debug log
- `src/contexts/ImpersonationContext.tsx` — gate behind DEV
- `src/pages/Employees.tsx` — remove debug log
- `src/pages/Settings.tsx` — remove debug log

### Not Changing
- UI design (no changes)
- Features (no removal)
- `select('*')` queries (too broad for this batch — incremental post-launch)
- Tooltip warning (cosmetic, no functional impact)

