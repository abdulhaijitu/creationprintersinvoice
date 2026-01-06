-- Create table to store dynamic org role permissions
CREATE TABLE IF NOT EXISTS public.org_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accounts', 'staff')),
  permission_key TEXT NOT NULL,
  permission_category TEXT NOT NULL,
  permission_label TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- Enable RLS
ALTER TABLE public.org_role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for super_admin to read permissions
CREATE POLICY "Super admins can read org role permissions"
ON public.org_role_permissions
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Create policy for super_admin to manage permissions
CREATE POLICY "Super admins can manage org role permissions"
ON public.org_role_permissions
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

-- Create policy for all authenticated users to read (needed for permission checks)
CREATE POLICY "All users can read org role permissions for checks"
ON public.org_role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_org_role_permissions_updated_at
BEFORE UPDATE ON public.org_role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for Owner (all enabled, protected core permissions)
INSERT INTO public.org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected) VALUES
-- Dashboard & Data
('owner', 'dashboard.view', 'Dashboard & Data', 'View Dashboard', true, true),
('owner', 'reports.view', 'Dashboard & Data', 'View Reports', true, false),
('owner', 'analytics.view', 'Dashboard & Data', 'Advanced Analytics', true, false),
-- Operations
('owner', 'invoices.create', 'Operations', 'Create Invoice', true, false),
('owner', 'invoices.edit', 'Operations', 'Edit Invoice', true, false),
('owner', 'invoices.delete', 'Operations', 'Delete Invoice', true, false),
('owner', 'customers.manage', 'Operations', 'Manage Customers', true, false),
('owner', 'products.manage', 'Operations', 'Manage Products', true, false),
-- User Management
('owner', 'users.view', 'User Management', 'View Users', true, true),
('owner', 'users.create', 'User Management', 'Create Users', true, true),
('owner', 'users.edit', 'User Management', 'Edit Users', true, true),
('owner', 'users.role_change', 'User Management', 'Change User Role', true, true),
-- Settings & Billing
('owner', 'settings.access', 'Settings & Billing', 'App Settings', true, true),
('owner', 'billing.view', 'Settings & Billing', 'Billing & Plan View', true, true),
('owner', 'billing.upgrade', 'Settings & Billing', 'Upgrade / Change Plan', true, true),
-- Advanced
('owner', 'audit_logs.view', 'Advanced', 'View Audit Logs', true, false),
('owner', 'api.access', 'Advanced', 'API Access', true, false),
('owner', 'branding.custom', 'Advanced', 'Custom Branding', true, false);

-- Insert default permissions for Manager
INSERT INTO public.org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected) VALUES
-- Dashboard & Data
('manager', 'dashboard.view', 'Dashboard & Data', 'View Dashboard', true, false),
('manager', 'reports.view', 'Dashboard & Data', 'View Reports', true, false),
('manager', 'analytics.view', 'Dashboard & Data', 'Advanced Analytics', false, false),
-- Operations
('manager', 'invoices.create', 'Operations', 'Create Invoice', true, false),
('manager', 'invoices.edit', 'Operations', 'Edit Invoice', true, false),
('manager', 'invoices.delete', 'Operations', 'Delete Invoice', false, false),
('manager', 'customers.manage', 'Operations', 'Manage Customers', true, false),
('manager', 'products.manage', 'Operations', 'Manage Products', true, false),
-- User Management
('manager', 'users.view', 'User Management', 'View Users', true, false),
('manager', 'users.create', 'User Management', 'Create Users', false, false),
('manager', 'users.edit', 'User Management', 'Edit Users', false, false),
('manager', 'users.role_change', 'User Management', 'Change User Role', false, false),
-- Settings & Billing
('manager', 'settings.access', 'Settings & Billing', 'App Settings', false, false),
('manager', 'billing.view', 'Settings & Billing', 'Billing & Plan View', false, false),
('manager', 'billing.upgrade', 'Settings & Billing', 'Upgrade / Change Plan', false, false),
-- Advanced
('manager', 'audit_logs.view', 'Advanced', 'View Audit Logs', false, false),
('manager', 'api.access', 'Advanced', 'API Access', false, false),
('manager', 'branding.custom', 'Advanced', 'Custom Branding', false, false);

-- Insert default permissions for Accounts
INSERT INTO public.org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected) VALUES
-- Dashboard & Data
('accounts', 'dashboard.view', 'Dashboard & Data', 'View Dashboard', true, false),
('accounts', 'reports.view', 'Dashboard & Data', 'View Reports', true, false),
('accounts', 'analytics.view', 'Dashboard & Data', 'Advanced Analytics', false, false),
-- Operations
('accounts', 'invoices.create', 'Operations', 'Create Invoice', true, false),
('accounts', 'invoices.edit', 'Operations', 'Edit Invoice', true, false),
('accounts', 'invoices.delete', 'Operations', 'Delete Invoice', false, false),
('accounts', 'customers.manage', 'Operations', 'Manage Customers', true, false),
('accounts', 'products.manage', 'Operations', 'Manage Products', false, false),
-- User Management
('accounts', 'users.view', 'User Management', 'View Users', false, false),
('accounts', 'users.create', 'User Management', 'Create Users', false, false),
('accounts', 'users.edit', 'User Management', 'Edit Users', false, false),
('accounts', 'users.role_change', 'User Management', 'Change User Role', false, false),
-- Settings & Billing
('accounts', 'settings.access', 'Settings & Billing', 'App Settings', false, false),
('accounts', 'billing.view', 'Settings & Billing', 'Billing & Plan View', false, false),
('accounts', 'billing.upgrade', 'Settings & Billing', 'Upgrade / Change Plan', false, false),
-- Advanced
('accounts', 'audit_logs.view', 'Advanced', 'View Audit Logs', false, false),
('accounts', 'api.access', 'Advanced', 'API Access', false, false),
('accounts', 'branding.custom', 'Advanced', 'Custom Branding', false, false);

-- Insert default permissions for Staff
INSERT INTO public.org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected) VALUES
-- Dashboard & Data
('staff', 'dashboard.view', 'Dashboard & Data', 'View Dashboard', true, false),
('staff', 'reports.view', 'Dashboard & Data', 'View Reports', false, false),
('staff', 'analytics.view', 'Dashboard & Data', 'Advanced Analytics', false, false),
-- Operations
('staff', 'invoices.create', 'Operations', 'Create Invoice', true, false),
('staff', 'invoices.edit', 'Operations', 'Edit Invoice', false, false),
('staff', 'invoices.delete', 'Operations', 'Delete Invoice', false, false),
('staff', 'customers.manage', 'Operations', 'Manage Customers', true, false),
('staff', 'products.manage', 'Operations', 'Manage Products', false, false),
-- User Management
('staff', 'users.view', 'User Management', 'View Users', false, false),
('staff', 'users.create', 'User Management', 'Create Users', false, false),
('staff', 'users.edit', 'User Management', 'Edit Users', false, false),
('staff', 'users.role_change', 'User Management', 'Change User Role', false, false),
-- Settings & Billing
('staff', 'settings.access', 'Settings & Billing', 'App Settings', false, false),
('staff', 'billing.view', 'Settings & Billing', 'Billing & Plan View', false, false),
('staff', 'billing.upgrade', 'Settings & Billing', 'Upgrade / Change Plan', false, false),
-- Advanced
('staff', 'audit_logs.view', 'Advanced', 'View Audit Logs', false, false),
('staff', 'api.access', 'Advanced', 'API Access', false, false),
('staff', 'branding.custom', 'Advanced', 'Custom Branding', false, false);