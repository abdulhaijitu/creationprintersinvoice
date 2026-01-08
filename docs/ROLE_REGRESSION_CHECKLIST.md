# Role System Regression Test Checklist

## Purpose
This document serves as an internal developer reference for testing role-related functionality before releasing any role-related changes.

---

## Pre-Release Checklist

### 1. Organization Creation & Owner Assignment
- [ ] Creating a new organization assigns the creator as `owner` role
- [ ] Only ONE owner exists per organization after creation
- [ ] Owner is correctly reflected in `organization_members` table
- [ ] Owner is correctly reflected in `organizations.owner_id` column

### 2. Owner Uniqueness & Protection
- [ ] Only one owner per organization at any time
- [ ] Owner role cannot be removed without replacement
- [ ] Owner cannot be demoted through normal role update UI
- [ ] Attempting to assign `owner` role via `update_role` action fails with 403

### 3. Role Assignment Boundaries
- [ ] Org admin cannot promote self to owner
- [ ] Org staff cannot change own role
- [ ] Only owner can access billing settings
- [ ] Only owner can manage team member roles
- [ ] Role changes respect `ORG_PERMISSION_MATRIX`

### 4. Super Admin Capabilities
- [ ] Super admin can view all organizations
- [ ] Super admin can reassign owner via `reassign_owner` action
- [ ] Previous owner is demoted to `manager` on reassignment
- [ ] Ownership reassignment is logged in `admin_audit_logs`
- [ ] Ownership reassignment is logged in `ownership_history`
- [ ] Super admin cannot perform org-level actions (invoices, etc.) without impersonation

### 5. Ownership Transfer Request Flow
- [ ] Only owner can create transfer request
- [ ] Only one pending request per organization
- [ ] Target user must be existing org member
- [ ] Cannot request transfer to self
- [ ] Owner can cancel pending request
- [ ] Super admin can approve transfer request
- [ ] Super admin can reject transfer request with reason
- [ ] Approved transfer updates owner in `organization_members`
- [ ] Approved transfer updates `organizations.owner_id`
- [ ] Previous owner is demoted to `manager` on approval
- [ ] All transfer actions logged in `ownership_history`

### 6. Edge Function Enforcement
- [ ] All sensitive actions validated server-side
- [ ] Role is NEVER trusted from client payload
- [ ] Role is resolved from database in Edge Functions
- [ ] Invalid role changes return 403 Forbidden
- [ ] Unauthorized access attempts are logged

### 7. UI Permission Visibility
- [ ] Role-based UI visibility matches actual permissions
- [ ] Protected actions show appropriate disabled states
- [ ] Owner badge displays correctly for owner users
- [ ] Non-owners cannot see owner-only settings
- [ ] Super admin panel only accessible to super admins

### 8. Data Integrity
- [ ] No orphaned organization_members records
- [ ] No organizations without owners
- [ ] No duplicate owner roles in same organization
- [ ] Ownership history is append-only (immutable)

---

## Test Scenarios

### Scenario A: New Organization Flow
1. User registers and creates organization
2. Verify user is assigned `owner` role
3. Verify `organizations.owner_id` matches user ID
4. Verify ownership_history has `initial_assignment` entry

### Scenario B: Owner Transfer Flow
1. Owner creates transfer request to team member
2. Verify request appears in super admin panel
3. Super admin approves request
4. Verify new owner has `owner` role
5. Verify old owner has `manager` role
6. Verify ownership_history has `transfer_approved` entry

### Scenario C: Unauthorized Role Change
1. Staff user attempts role change via API
2. Verify 403 response
3. Verify role unchanged in database
4. Verify attempt logged (if applicable)

### Scenario D: Super Admin Reassignment
1. Super admin opens organization details
2. Super admin selects new owner from members
3. Super admin confirms reassignment
4. Verify ownership changed
5. Verify audit logs updated

---

## Edge Cases to Test

- [ ] What happens if owner is removed from auth.users?
- [ ] What happens if target user leaves org before transfer approval?
- [ ] What happens if org has only one member (owner)?
- [ ] What happens on concurrent ownership operations?
- [ ] What happens if database constraint is violated?

---

## Sign-off

| Tester | Date | Version | All Tests Passed |
|--------|------|---------|------------------|
|        |      |         | [ ] Yes [ ] No   |

---

*Last Updated: 2026-01-08*
