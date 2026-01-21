-- Add paid_amount column to vendor_bills for tracking partial payments
ALTER TABLE public.vendor_bills 
ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0 NOT NULL;

-- Add vendor_bill_pay permissions to org_role_permissions
INSERT INTO public.org_role_permissions (role, permission_key, permission_category, permission_label, is_enabled, is_protected)
VALUES 
  ('owner', 'vendor_bill_pay.create', 'BUSINESS', 'Pay Vendor Bills', true, true),
  ('manager', 'vendor_bill_pay.create', 'BUSINESS', 'Pay Vendor Bills', true, false),
  ('accounts', 'vendor_bill_pay.create', 'BUSINESS', 'Pay Vendor Bills', true, false),
  ('staff', 'vendor_bill_pay.create', 'BUSINESS', 'Pay Vendor Bills', false, false)
ON CONFLICT (role, permission_key) DO NOTHING;