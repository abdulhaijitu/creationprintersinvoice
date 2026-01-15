-- Add payment permissions to org_role_permissions table
-- This allows permission-based access control instead of hardcoded roles

-- Payment permissions for owner (full access)
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  ('owner', 'payments.view', 'MAIN', 'View Payments', true, true),
  ('owner', 'payments.create', 'MAIN', 'Create Payments', true, true),
  ('owner', 'payments.edit', 'MAIN', 'Edit Payments', true, true),
  ('owner', 'payments.delete', 'MAIN', 'Delete/Refund Payments', true, true),
  ('owner', 'payments.manage', 'MAIN', 'Manage Payments', true, true)
ON CONFLICT (role, permission_key) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled, 
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category;

-- Payment permissions for manager
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  ('manager', 'payments.view', 'MAIN', 'View Payments', true, false),
  ('manager', 'payments.create', 'MAIN', 'Create Payments', true, false),
  ('manager', 'payments.edit', 'MAIN', 'Edit Payments', true, false),
  ('manager', 'payments.delete', 'MAIN', 'Delete/Refund Payments', true, false),
  ('manager', 'payments.manage', 'MAIN', 'Manage Payments', true, false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled, 
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category;

-- Payment permissions for accounts
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  ('accounts', 'payments.view', 'MAIN', 'View Payments', true, false),
  ('accounts', 'payments.create', 'MAIN', 'Create Payments', true, false),
  ('accounts', 'payments.edit', 'MAIN', 'Edit Payments', true, false),
  ('accounts', 'payments.delete', 'MAIN', 'Delete/Refund Payments', false, false),
  ('accounts', 'payments.manage', 'MAIN', 'Manage Payments', true, false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled, 
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category;

-- Payment permissions for staff (disabled by default, can be enabled via role management)
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  ('staff', 'payments.view', 'MAIN', 'View Payments', false, false),
  ('staff', 'payments.create', 'MAIN', 'Create Payments', false, false),
  ('staff', 'payments.edit', 'MAIN', 'Edit Payments', false, false),
  ('staff', 'payments.delete', 'MAIN', 'Delete/Refund Payments', false, false),
  ('staff', 'payments.manage', 'MAIN', 'Manage Payments', false, false)
ON CONFLICT (role, permission_key) DO UPDATE 
SET is_enabled = EXCLUDED.is_enabled, 
    permission_label = EXCLUDED.permission_label,
    permission_category = EXCLUDED.permission_category;