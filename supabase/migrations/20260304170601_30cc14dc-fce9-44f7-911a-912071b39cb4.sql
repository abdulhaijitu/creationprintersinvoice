
-- 1. notification_templates: Enable RLS + authenticated-only read
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notification templates"
ON public.notification_templates
FOR SELECT
TO authenticated
USING (true);

-- 2. plan_pricing: Enable RLS + authenticated-only read
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read plan pricing"
ON public.plan_pricing
FOR SELECT
TO authenticated
USING (true);

-- 3. plan_limits: Enable RLS + authenticated-only read
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read plan limits"
ON public.plan_limits
FOR SELECT
TO authenticated
USING (true);

-- 4. expense_categories: Enable RLS + authenticated-only read
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expense categories"
ON public.expense_categories
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Org members can manage expense categories"
ON public.expense_categories
FOR ALL
TO authenticated
USING (
  organization_id IS NULL 
  OR public.user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
  organization_id IS NULL 
  OR public.user_belongs_to_org(auth.uid(), organization_id)
);
