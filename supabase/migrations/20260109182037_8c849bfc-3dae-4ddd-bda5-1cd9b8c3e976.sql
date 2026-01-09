-- =====================================================
-- CRITICAL: Remove Super Admin bypass from ALL business tables
-- Super Admins should NEVER see org business data from the admin panel
-- They can only access this data when impersonating (which sets org context)
-- =====================================================

-- 1. INVOICES - Remove is_platform_admin from SELECT and DELETE
DROP POLICY IF EXISTS "Users can view org invoices" ON public.invoices;
DROP POLICY IF EXISTS "Org admins can delete invoices" ON public.invoices;

CREATE POLICY "Users can view org invoices" ON public.invoices
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org admins can delete invoices" ON public.invoices
FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

-- Force RLS for invoices
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

-- 2. INVOICE_ITEMS - Remove is_platform_admin from ALL policy
DROP POLICY IF EXISTS "Users can manage org invoice items" ON public.invoice_items;

CREATE POLICY "Users can manage org invoice items" ON public.invoice_items
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

ALTER TABLE public.invoice_items FORCE ROW LEVEL SECURITY;

-- 3. INVOICE_PAYMENTS - Remove is_platform_admin from ALL policy
DROP POLICY IF EXISTS "Users can manage org invoice payments" ON public.invoice_payments;

CREATE POLICY "Users can manage org invoice payments" ON public.invoice_payments
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

ALTER TABLE public.invoice_payments FORCE ROW LEVEL SECURITY;

-- 4. QUOTATIONS - Remove is_platform_admin from SELECT and DELETE
DROP POLICY IF EXISTS "Users can view org quotations" ON public.quotations;
DROP POLICY IF EXISTS "Org admins can delete quotations" ON public.quotations;

CREATE POLICY "Users can view org quotations" ON public.quotations
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org admins can delete quotations" ON public.quotations
FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;

-- 5. QUOTATION_ITEMS - Remove is_platform_admin from ALL policy
DROP POLICY IF EXISTS "Users can manage org quotation items" ON public.quotation_items;

CREATE POLICY "Users can manage org quotation items" ON public.quotation_items
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

ALTER TABLE public.quotation_items FORCE ROW LEVEL SECURITY;

-- 6. CUSTOMERS - Remove is_platform_admin from SELECT and DELETE
DROP POLICY IF EXISTS "Users can view org customers" ON public.customers;
DROP POLICY IF EXISTS "Org admins can delete customers" ON public.customers;

CREATE POLICY "Users can view org customers" ON public.customers
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org admins can delete customers" ON public.customers
FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

-- 7. VENDORS - Remove is_platform_admin from ALL and SELECT policies
DROP POLICY IF EXISTS "Users can manage org vendors" ON public.vendors;
DROP POLICY IF EXISTS "Users can view org vendors" ON public.vendors;

CREATE POLICY "Users can view org vendors" ON public.vendors
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can manage org vendors" ON public.vendors
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;

-- 8. EXPENSES - Remove is_platform_admin from SELECT and DELETE
DROP POLICY IF EXISTS "Users can view org expenses" ON public.expenses;
DROP POLICY IF EXISTS "Org admins can delete expenses" ON public.expenses;

CREATE POLICY "Users can view org expenses" ON public.expenses
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org admins can delete expenses" ON public.expenses
FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;

-- 9. DELIVERY_CHALLANS - Remove is_platform_admin from SELECT and DELETE
DROP POLICY IF EXISTS "Users can view org delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "Org admins can delete delivery challans" ON public.delivery_challans;

CREATE POLICY "Users can view org delivery challans" ON public.delivery_challans
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org admins can delete delivery challans" ON public.delivery_challans
FOR DELETE USING (is_org_admin(auth.uid(), organization_id));

ALTER TABLE public.delivery_challans FORCE ROW LEVEL SECURITY;

-- 10. DELIVERY_CHALLAN_ITEMS - Remove is_platform_admin from ALL policy
DROP POLICY IF EXISTS "Users can manage org delivery challan items" ON public.delivery_challan_items;

CREATE POLICY "Users can manage org delivery challan items" ON public.delivery_challan_items
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()))
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

ALTER TABLE public.delivery_challan_items FORCE ROW LEVEL SECURITY;