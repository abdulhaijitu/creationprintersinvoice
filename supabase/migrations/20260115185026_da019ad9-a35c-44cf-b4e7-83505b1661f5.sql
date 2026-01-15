-- Update payment permissions to use 'Sales & Billing' category to show in UI
UPDATE org_role_permissions 
SET permission_category = 'Sales & Billing'
WHERE permission_key LIKE 'payments.%';