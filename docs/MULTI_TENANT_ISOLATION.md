# Multi-Tenant Data Isolation Architecture

## Overview

This document describes the multi-tenant data isolation system that ensures **absolute separation** between:
1. **User Organization Panels** - Users only see data from their active organization
2. **Super Admin App Panel** - Platform-level metadata ONLY, never organization business data

## Architecture Layers

### Layer 1: App Context (`src/contexts/AppContext.tsx`)

The AppContext determines the current application context:
- `user` - Normal user accessing organization data
- `super_admin` - Super Admin in admin panel (NOT impersonating)

Key behaviors:
- **Context Detection**: Based on route + user role + impersonation state
- **Cache Clearing**: Automatic on context switch to prevent "ghost data"
- **State Isolation**: Separate state between app contexts

### Layer 2: Organization Scoped Query (`src/hooks/useOrgScopedQuery.ts`)

This hook enforces query-level data isolation:

```typescript
const { organizationId, shouldBlockDataQueries, applyOrgFilter } = useOrgScopedQuery();

// CRITICAL: Always check before fetching
if (shouldBlockDataQueries) {
  return []; // Return empty, never fetch
}

// Apply org filter to every query
const query = supabase.from('invoices').select('*');
const scopedQuery = applyOrgFilter(query);
if (!scopedQuery) return; // Query blocked

const { data } = await scopedQuery;
```

**Blocking Rules:**
- Super Admin in admin panel (not impersonating) → BLOCK ALL BUSINESS DATA
- No organization context → BLOCK ALL BUSINESS DATA

### Layer 3: Route Guards (`src/components/guards/RouteGuard.tsx`)

Components that enforce routing boundaries:

1. **UserAppGuard** - Protects user app routes
   - Super Admin without impersonation → Redirect to /admin
   
2. **AdminRouteGuard** - Protects admin routes
   - Non-Super Admin → Redirect to /admin/login
   - Impersonating → Redirect to /

3. **OrgContextGuard** - Prevents rendering without org context
   - Use for components that require organization data

### Layer 4: RLS Policies (Database)

Supabase Row Level Security enforces server-side isolation:

```sql
-- Business tables MUST have this pattern
CREATE POLICY "Users can only view their org data"
ON public.invoices
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth.uid()
  )
);
```

**CRITICAL**: Super Admin bypass is REMOVED for business tables.

## Data Flow

### User App Context
```
User Request → UserAppGuard → OrgContextGuard → useOrgScopedQuery
                                                    ↓
                                              Check hasOrgContext
                                                    ↓
                                              applyOrgFilter(query)
                                                    ↓
                                              RLS Policy Check
                                                    ↓
                                              Return Org-Scoped Data
```

### Super Admin Context (No Impersonation)
```
Admin Request → AdminRouteGuard → useOrgScopedQuery
                                       ↓
                                  shouldBlockDataQueries = true
                                       ↓
                                  BLOCK ALL BUSINESS QUERIES
                                       ↓
                                  Return Empty Array
```

### Super Admin Context (Impersonating)
```
Impersonation Start → Clear All Cache → OrganizationContext loads impersonated org
                                              ↓
                                        UserAppGuard (allowed)
                                              ↓
                                        OrgContextGuard (allowed)
                                              ↓
                                        useOrgScopedQuery with impersonated orgId
                                              ↓
                                        Normal data access for that org
```

## Security Rules

### Hard Rules
1. **Super Admin app NEVER shows business data** (invoices, customers, vendors, etc.)
2. **All business queries MUST include organization_id filter**
3. **Context switch MUST clear all cached data**
4. **Fail CLOSED** - Block if uncertain about context

### Business Tables (Protected)
- invoices
- invoice_items
- invoice_payments
- quotations
- quotation_items
- customers
- vendors
- vendor_bills
- expenses
- employees
- tasks
- delivery_challans
- attendance
- leave_requests
- salary_records

### Platform Tables (Accessible to Super Admin)
- organizations (metadata only)
- users/profiles
- subscriptions
- billing_invoices
- admin_audit_logs
- enhanced_audit_logs

## Implementation Checklist

When adding new business data features:

- [ ] Use `useOrgScopedQuery()` hook
- [ ] Check `shouldBlockDataQueries` before fetching
- [ ] Apply `applyOrgFilter()` to all queries
- [ ] Add `organization_id` column to new tables
- [ ] Create RLS policies WITHOUT Super Admin bypass
- [ ] Wrap components in `OrgContextGuard` if needed
- [ ] Include `organization_id` in all INSERT operations

## Testing Multi-Tenant Isolation

1. **As User**: Verify only own org data is visible
2. **As Super Admin (Admin Panel)**: Verify NO business data is visible
3. **As Super Admin (Impersonating)**: Verify ONLY impersonated org data is visible
4. **Context Switch**: Verify data clears when switching contexts
5. **Direct URL Access**: Verify guards block unauthorized routes
