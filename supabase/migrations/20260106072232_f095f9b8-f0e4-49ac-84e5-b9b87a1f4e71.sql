-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled', 'expired');

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Create organization role enum (different from app_role for tenant-level roles)
CREATE TYPE public.org_role AS ENUM ('owner', 'manager', 'accounts', 'staff');

-- Create organizations table (tenants)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_rate NUMERIC DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'INV',
  quotation_prefix TEXT DEFAULT 'QUO',
  challan_prefix TEXT DEFAULT 'DC',
  invoice_terms TEXT,
  invoice_footer TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_routing_number TEXT,
  mobile_banking TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trial',
  user_limit INTEGER DEFAULT 5,
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create organization_members table (links users to organizations with roles)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id to all existing tables
ALTER TABLE public.customers ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.quotations ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.quotation_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.expense_categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vendors ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vendor_bills ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vendor_payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_challans ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_challan_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.price_calculations ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.employee_attendance ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.employee_advances ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.employee_salary_records ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.audit_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Helper function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Helper function to check user's org role
CREATE OR REPLACE FUNCTION public.get_user_org_role(_user_id UUID, _org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.organization_members 
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

-- Helper function to check if user is org owner or manager
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members 
    WHERE user_id = _user_id 
      AND organization_id = _org_id
      AND role IN ('owner', 'manager')
  )
$$;

-- Helper function to check if user is platform super admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (
  public.user_belongs_to_org(auth.uid(), id) 
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Owners can update their organization"
ON public.organizations FOR UPDATE
USING (
  public.get_user_org_role(auth.uid(), id) = 'owner'
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Anyone can create organization during signup"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their org subscription"
ON public.subscriptions FOR SELECT
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admin can manage subscriptions"
ON public.subscriptions FOR ALL
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "System can create subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for organization_members
CREATE POLICY "Users can view org members"
ON public.organization_members FOR SELECT
USING (
  public.user_belongs_to_org(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage members"
ON public.organization_members FOR ALL
USING (
  public.is_org_admin(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "System can create members during signup"
ON public.organization_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update triggers for new tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_customers_org_id ON public.customers(organization_id);
CREATE INDEX idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX idx_expenses_org_id ON public.expenses(organization_id);
CREATE INDEX idx_vendors_org_id ON public.vendors(organization_id);
CREATE INDEX idx_quotations_org_id ON public.quotations(organization_id);
CREATE INDEX idx_tasks_org_id ON public.tasks(organization_id);