-- Update RLS policies on existing tables to use organization-based filtering
-- Drop old policies and create new tenant-aware policies

-- CUSTOMERS TABLE
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;

CREATE POLICY "Users can view org customers"
ON public.customers FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org customers"
ON public.customers FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org customers"
ON public.customers FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete customers"
ON public.customers FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- INVOICES TABLE
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;

CREATE POLICY "Users can view org invoices"
ON public.invoices FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org invoices"
ON public.invoices FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org invoices"
ON public.invoices FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete invoices"
ON public.invoices FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- INVOICE_ITEMS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON public.invoice_items;

CREATE POLICY "Users can manage org invoice items"
ON public.invoice_items FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- INVOICE_PAYMENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage invoice payments" ON public.invoice_payments;

CREATE POLICY "Users can manage org invoice payments"
ON public.invoice_payments FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- EXPENSES TABLE
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Privileged users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Privileged users can delete expenses" ON public.expenses;

CREATE POLICY "Users can view org expenses"
ON public.expenses FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org expenses"
ON public.expenses FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org expenses"
ON public.expenses FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete expenses"
ON public.expenses FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- EXPENSE_CATEGORIES TABLE
DROP POLICY IF EXISTS "Authenticated users can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Privileged users can manage expense categories" ON public.expense_categories;

CREATE POLICY "Users can view org expense categories"
ON public.expense_categories FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR organization_id IS NULL
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can manage org expense categories"
ON public.expense_categories FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- VENDORS TABLE
DROP POLICY IF EXISTS "Authenticated users can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Admins can manage vendors" ON public.vendors;

CREATE POLICY "Users can view org vendors"
ON public.vendors FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can manage org vendors"
ON public.vendors FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- VENDOR_BILLS TABLE
DROP POLICY IF EXISTS "Authenticated users can view vendor bills" ON public.vendor_bills;
DROP POLICY IF EXISTS "Admins can manage vendor bills" ON public.vendor_bills;

CREATE POLICY "Users can view org vendor bills"
ON public.vendor_bills FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can manage org vendor bills"
ON public.vendor_bills FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- VENDOR_PAYMENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can view vendor payments" ON public.vendor_payments;
DROP POLICY IF EXISTS "Admins can manage vendor payments" ON public.vendor_payments;

CREATE POLICY "Users can view org vendor payments"
ON public.vendor_payments FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can manage org vendor payments"
ON public.vendor_payments FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- QUOTATIONS TABLE
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can insert quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can update quotations" ON public.quotations;
DROP POLICY IF EXISTS "Admins can delete quotations" ON public.quotations;

CREATE POLICY "Users can view org quotations"
ON public.quotations FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org quotations"
ON public.quotations FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org quotations"
ON public.quotations FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete quotations"
ON public.quotations FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- QUOTATION_ITEMS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage quotation items" ON public.quotation_items;

CREATE POLICY "Users can manage org quotation items"
ON public.quotation_items FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- DELIVERY_CHALLANS TABLE
DROP POLICY IF EXISTS "Users can view all delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "Privileged users can create delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "Privileged users can update delivery challans" ON public.delivery_challans;
DROP POLICY IF EXISTS "Privileged users can delete draft challans" ON public.delivery_challans;

CREATE POLICY "Users can view org delivery challans"
ON public.delivery_challans FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org delivery challans"
ON public.delivery_challans FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org delivery challans"
ON public.delivery_challans FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete delivery challans"
ON public.delivery_challans FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- DELIVERY_CHALLAN_ITEMS TABLE
DROP POLICY IF EXISTS "Users can view all challan items" ON public.delivery_challan_items;
DROP POLICY IF EXISTS "Privileged users can manage challan items" ON public.delivery_challan_items;

CREATE POLICY "Users can manage org delivery challan items"
ON public.delivery_challan_items FOR ALL
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- PRICE_CALCULATIONS TABLE
DROP POLICY IF EXISTS "Authenticated users can view price calculations" ON public.price_calculations;
DROP POLICY IF EXISTS "Authenticated users can insert price calculations" ON public.price_calculations;
DROP POLICY IF EXISTS "Authenticated users can update price calculations" ON public.price_calculations;
DROP POLICY IF EXISTS "Admins can delete price calculations" ON public.price_calculations;

CREATE POLICY "Users can view org price calculations"
ON public.price_calculations FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org price calculations"
ON public.price_calculations FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org price calculations"
ON public.price_calculations FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete price calculations"
ON public.price_calculations FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- TASKS TABLE
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

CREATE POLICY "Users can view org tasks"
ON public.tasks FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert org tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update org tasks"
ON public.tasks FOR UPDATE
USING (
  organization_id = public.get_user_organization_id(auth.uid())
);

CREATE POLICY "Org admins can delete tasks"
ON public.tasks FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- EMPLOYEES TABLE
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;

CREATE POLICY "Users can view org employees"
ON public.employees FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage employees"
ON public.employees FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- EMPLOYEE_ATTENDANCE TABLE
DROP POLICY IF EXISTS "Admins can manage employee attendance" ON public.employee_attendance;

CREATE POLICY "Users can view org employee attendance"
ON public.employee_attendance FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage employee attendance"
ON public.employee_attendance FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- EMPLOYEE_ADVANCES TABLE
DROP POLICY IF EXISTS "Admins can manage employee advances" ON public.employee_advances;

CREATE POLICY "Users can view org employee advances"
ON public.employee_advances FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage employee advances"
ON public.employee_advances FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- EMPLOYEE_SALARY_RECORDS TABLE
DROP POLICY IF EXISTS "Admins can manage employee salary records" ON public.employee_salary_records;

CREATE POLICY "Users can view org employee salary records"
ON public.employee_salary_records FOR SELECT
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage employee salary records"
ON public.employee_salary_records FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

-- NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

CREATE POLICY "Users can view org notifications"
ON public.notifications FOR SELECT
USING (
  (organization_id = public.get_user_organization_id(auth.uid()) AND user_id = auth.uid())
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "System can insert org notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

-- AUDIT_LOGS TABLE
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Privileged users can view audit logs" ON public.audit_logs;

CREATE POLICY "Users can view org audit logs"
ON public.audit_logs FOR SELECT
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);