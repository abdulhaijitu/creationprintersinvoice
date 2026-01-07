-- First, delete existing permissions to replace with new hierarchical structure
TRUNCATE TABLE plan_permission_presets;
TRUNCATE TABLE org_specific_permissions;
TRUNCATE TABLE org_role_permissions;

-- Insert new hierarchical permission structure
-- Format: menu.access for menu level, menu.submenu for sub-menu level

-- ===================== OWNER PERMISSIONS =====================
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  -- Menu Access
  ('owner', 'dashboard.access', 'Core', 'Dashboard Access', true, true),
  ('owner', 'sales_billing.access', 'Sales & Billing', 'Sales & Billing Menu', true, true),
  ('owner', 'expenses.access', 'Expenses', 'Expenses Menu', true, false),
  ('owner', 'hr_workforce.access', 'HR & Workforce', 'HR & Workforce Menu', true, false),
  ('owner', 'reports.access', 'Reports', 'Reports Menu', true, false),
  ('owner', 'settings.access', 'Settings', 'Settings Menu', true, true),
  
  -- Sales & Billing Sub-Menus
  ('owner', 'sales.customers', 'Sales & Billing', 'Customers', true, false),
  ('owner', 'sales.invoices', 'Sales & Billing', 'Invoices', true, true),
  ('owner', 'sales.quotations', 'Sales & Billing', 'Quotations', true, false),
  ('owner', 'sales.delivery_challans', 'Sales & Billing', 'Delivery Challans', true, false),
  ('owner', 'sales.price_calculations', 'Sales & Billing', 'Price Calculations', true, false),
  
  -- Expenses Sub-Menus
  ('owner', 'expenses.vendors', 'Expenses', 'Vendors', true, false),
  ('owner', 'expenses.expenses', 'Expenses', 'Expenses', true, false),
  
  -- HR & Workforce Sub-Menus
  ('owner', 'hr.employees', 'HR & Workforce', 'Employees', true, false),
  ('owner', 'hr.attendance', 'HR & Workforce', 'Attendance', true, false),
  ('owner', 'hr.leave_management', 'HR & Workforce', 'Leave Management', true, false),
  ('owner', 'hr.payroll', 'HR & Workforce', 'Payroll', true, false),
  ('owner', 'hr.performance', 'HR & Workforce', 'Performance', true, false),
  ('owner', 'hr.tasks', 'HR & Workforce', 'Tasks', true, false),
  
  -- Reports Sub-Menus
  ('owner', 'reports.financial', 'Reports', 'Financial Reports', true, false),
  ('owner', 'reports.hr', 'Reports', 'HR Reports', true, false),
  
  -- Settings Sub-Menus
  ('owner', 'settings.role_management', 'Settings', 'Role Management', true, true),
  ('owner', 'settings.organization_settings', 'Settings', 'Organization Settings', true, true),
  ('owner', 'settings.team_members', 'Settings', 'Team Members', true, false),
  ('owner', 'settings.usage_limits', 'Settings', 'Usage & Limits', true, false),
  ('owner', 'settings.notifications', 'Settings', 'Notifications', true, false),
  ('owner', 'settings.white_label', 'Settings', 'White-Label', true, false),
  ('owner', 'settings.billing', 'Settings', 'Billing', true, true),
  ('owner', 'settings.platform_admin', 'Settings', 'Platform Admin', true, true);

-- ===================== MANAGER PERMISSIONS =====================
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  -- Menu Access
  ('manager', 'dashboard.access', 'Core', 'Dashboard Access', true, false),
  ('manager', 'sales_billing.access', 'Sales & Billing', 'Sales & Billing Menu', true, false),
  ('manager', 'expenses.access', 'Expenses', 'Expenses Menu', true, false),
  ('manager', 'hr_workforce.access', 'HR & Workforce', 'HR & Workforce Menu', true, false),
  ('manager', 'reports.access', 'Reports', 'Reports Menu', true, false),
  ('manager', 'settings.access', 'Settings', 'Settings Menu', true, false),
  
  -- Sales & Billing Sub-Menus
  ('manager', 'sales.customers', 'Sales & Billing', 'Customers', true, false),
  ('manager', 'sales.invoices', 'Sales & Billing', 'Invoices', true, false),
  ('manager', 'sales.quotations', 'Sales & Billing', 'Quotations', true, false),
  ('manager', 'sales.delivery_challans', 'Sales & Billing', 'Delivery Challans', true, false),
  ('manager', 'sales.price_calculations', 'Sales & Billing', 'Price Calculations', true, false),
  
  -- Expenses Sub-Menus
  ('manager', 'expenses.vendors', 'Expenses', 'Vendors', true, false),
  ('manager', 'expenses.expenses', 'Expenses', 'Expenses', true, false),
  
  -- HR & Workforce Sub-Menus
  ('manager', 'hr.employees', 'HR & Workforce', 'Employees', true, false),
  ('manager', 'hr.attendance', 'HR & Workforce', 'Attendance', true, false),
  ('manager', 'hr.leave_management', 'HR & Workforce', 'Leave Management', true, false),
  ('manager', 'hr.payroll', 'HR & Workforce', 'Payroll', false, false),
  ('manager', 'hr.performance', 'HR & Workforce', 'Performance', true, false),
  ('manager', 'hr.tasks', 'HR & Workforce', 'Tasks', true, false),
  
  -- Reports Sub-Menus
  ('manager', 'reports.financial', 'Reports', 'Financial Reports', true, false),
  ('manager', 'reports.hr', 'Reports', 'HR Reports', true, false),
  
  -- Settings Sub-Menus
  ('manager', 'settings.role_management', 'Settings', 'Role Management', false, false),
  ('manager', 'settings.organization_settings', 'Settings', 'Organization Settings', false, false),
  ('manager', 'settings.team_members', 'Settings', 'Team Members', true, false),
  ('manager', 'settings.usage_limits', 'Settings', 'Usage & Limits', true, false),
  ('manager', 'settings.notifications', 'Settings', 'Notifications', false, false),
  ('manager', 'settings.white_label', 'Settings', 'White-Label', false, false),
  ('manager', 'settings.billing', 'Settings', 'Billing', false, false),
  ('manager', 'settings.platform_admin', 'Settings', 'Platform Admin', false, false);

-- ===================== ACCOUNTS PERMISSIONS =====================
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  -- Menu Access
  ('accounts', 'dashboard.access', 'Core', 'Dashboard Access', true, false),
  ('accounts', 'sales_billing.access', 'Sales & Billing', 'Sales & Billing Menu', true, false),
  ('accounts', 'expenses.access', 'Expenses', 'Expenses Menu', true, false),
  ('accounts', 'hr_workforce.access', 'HR & Workforce', 'HR & Workforce Menu', true, false),
  ('accounts', 'reports.access', 'Reports', 'Reports Menu', true, false),
  ('accounts', 'settings.access', 'Settings', 'Settings Menu', false, false),
  
  -- Sales & Billing Sub-Menus
  ('accounts', 'sales.customers', 'Sales & Billing', 'Customers', true, false),
  ('accounts', 'sales.invoices', 'Sales & Billing', 'Invoices', true, false),
  ('accounts', 'sales.quotations', 'Sales & Billing', 'Quotations', true, false),
  ('accounts', 'sales.delivery_challans', 'Sales & Billing', 'Delivery Challans', true, false),
  ('accounts', 'sales.price_calculations', 'Sales & Billing', 'Price Calculations', true, false),
  
  -- Expenses Sub-Menus
  ('accounts', 'expenses.vendors', 'Expenses', 'Vendors', true, false),
  ('accounts', 'expenses.expenses', 'Expenses', 'Expenses', true, false),
  
  -- HR & Workforce Sub-Menus
  ('accounts', 'hr.employees', 'HR & Workforce', 'Employees', false, false),
  ('accounts', 'hr.attendance', 'HR & Workforce', 'Attendance', true, false),
  ('accounts', 'hr.leave_management', 'HR & Workforce', 'Leave Management', true, false),
  ('accounts', 'hr.payroll', 'HR & Workforce', 'Payroll', true, false),
  ('accounts', 'hr.performance', 'HR & Workforce', 'Performance', false, false),
  ('accounts', 'hr.tasks', 'HR & Workforce', 'Tasks', true, false),
  
  -- Reports Sub-Menus
  ('accounts', 'reports.financial', 'Reports', 'Financial Reports', true, false),
  ('accounts', 'reports.hr', 'Reports', 'HR Reports', true, false),
  
  -- Settings Sub-Menus (mostly disabled for accounts)
  ('accounts', 'settings.role_management', 'Settings', 'Role Management', false, false),
  ('accounts', 'settings.organization_settings', 'Settings', 'Organization Settings', false, false),
  ('accounts', 'settings.team_members', 'Settings', 'Team Members', false, false),
  ('accounts', 'settings.usage_limits', 'Settings', 'Usage & Limits', true, false),
  ('accounts', 'settings.notifications', 'Settings', 'Notifications', false, false),
  ('accounts', 'settings.white_label', 'Settings', 'White-Label', false, false),
  ('accounts', 'settings.billing', 'Settings', 'Billing', false, false),
  ('accounts', 'settings.platform_admin', 'Settings', 'Platform Admin', false, false);

-- ===================== STAFF PERMISSIONS =====================
INSERT INTO org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  -- Menu Access
  ('staff', 'dashboard.access', 'Core', 'Dashboard Access', true, false),
  ('staff', 'sales_billing.access', 'Sales & Billing', 'Sales & Billing Menu', true, false),
  ('staff', 'expenses.access', 'Expenses', 'Expenses Menu', false, false),
  ('staff', 'hr_workforce.access', 'HR & Workforce', 'HR & Workforce Menu', true, false),
  ('staff', 'reports.access', 'Reports', 'Reports Menu', false, false),
  ('staff', 'settings.access', 'Settings', 'Settings Menu', false, false),
  
  -- Sales & Billing Sub-Menus
  ('staff', 'sales.customers', 'Sales & Billing', 'Customers', true, false),
  ('staff', 'sales.invoices', 'Sales & Billing', 'Invoices', true, false),
  ('staff', 'sales.quotations', 'Sales & Billing', 'Quotations', true, false),
  ('staff', 'sales.delivery_challans', 'Sales & Billing', 'Delivery Challans', true, false),
  ('staff', 'sales.price_calculations', 'Sales & Billing', 'Price Calculations', true, false),
  
  -- Expenses Sub-Menus
  ('staff', 'expenses.vendors', 'Expenses', 'Vendors', false, false),
  ('staff', 'expenses.expenses', 'Expenses', 'Expenses', false, false),
  
  -- HR & Workforce Sub-Menus
  ('staff', 'hr.employees', 'HR & Workforce', 'Employees', false, false),
  ('staff', 'hr.attendance', 'HR & Workforce', 'Attendance', true, false),
  ('staff', 'hr.leave_management', 'HR & Workforce', 'Leave Management', true, false),
  ('staff', 'hr.payroll', 'HR & Workforce', 'Payroll', false, false),
  ('staff', 'hr.performance', 'HR & Workforce', 'Performance', false, false),
  ('staff', 'hr.tasks', 'HR & Workforce', 'Tasks', true, false),
  
  -- Reports Sub-Menus
  ('staff', 'reports.financial', 'Reports', 'Financial Reports', false, false),
  ('staff', 'reports.hr', 'Reports', 'HR Reports', false, false),
  
  -- Settings Sub-Menus (all disabled for staff)
  ('staff', 'settings.role_management', 'Settings', 'Role Management', false, false),
  ('staff', 'settings.organization_settings', 'Settings', 'Organization Settings', false, false),
  ('staff', 'settings.team_members', 'Settings', 'Team Members', false, false),
  ('staff', 'settings.usage_limits', 'Settings', 'Usage & Limits', true, false),
  ('staff', 'settings.notifications', 'Settings', 'Notifications', false, false),
  ('staff', 'settings.white_label', 'Settings', 'White-Label', false, false),
  ('staff', 'settings.billing', 'Settings', 'Billing', false, false),
  ('staff', 'settings.platform_admin', 'Settings', 'Platform Admin', false, false);

-- ===================== PLAN PERMISSION PRESETS =====================
-- Generate plan presets based on role permissions with plan-specific restrictions

-- FREE PLAN (Most restricted)
INSERT INTO plan_permission_presets (plan_name, role, permission_key, is_enabled)
SELECT 'free', role, permission_key, 
  CASE 
    -- Free plan restrictions
    WHEN permission_key IN ('reports.access', 'reports.financial', 'reports.hr') THEN false
    WHEN permission_key IN ('hr.performance', 'hr.payroll') THEN false
    WHEN permission_key IN ('settings.white_label', 'settings.platform_admin') THEN false
    ELSE is_enabled
  END
FROM org_role_permissions;

-- BASIC PLAN (Moderate restrictions)
INSERT INTO plan_permission_presets (plan_name, role, permission_key, is_enabled)
SELECT 'basic', role, permission_key,
  CASE 
    -- Basic plan restrictions
    WHEN permission_key IN ('settings.white_label', 'settings.platform_admin') THEN false
    WHEN permission_key = 'hr.performance' AND role IN ('staff', 'accounts') THEN false
    ELSE is_enabled
  END
FROM org_role_permissions;

-- PRO PLAN (Most features)
INSERT INTO plan_permission_presets (plan_name, role, permission_key, is_enabled)
SELECT 'pro', role, permission_key,
  CASE 
    -- Pro plan restrictions (only platform admin blocked)
    WHEN permission_key = 'settings.platform_admin' THEN false
    ELSE is_enabled
  END
FROM org_role_permissions;

-- ENTERPRISE PLAN (All features)
INSERT INTO plan_permission_presets (plan_name, role, permission_key, is_enabled)
SELECT 'enterprise', role, permission_key, is_enabled
FROM org_role_permissions;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_permission_presets_lookup 
  ON plan_permission_presets(plan_name, role, permission_key);