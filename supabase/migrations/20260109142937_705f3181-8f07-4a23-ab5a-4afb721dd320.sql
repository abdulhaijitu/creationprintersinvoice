-- Add organization_id to tables that are missing it

-- 1. Add organization_id to attendance table
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 2. Add organization_id to leave_balances table
ALTER TABLE public.leave_balances ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 3. Add organization_id to leave_requests table
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 4. Add organization_id to performance_notes table
ALTER TABLE public.performance_notes ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 5. Add organization_id to salary_advances table
ALTER TABLE public.salary_advances ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 6. Add organization_id to salary_records table
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_organization_id ON public.attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_organization_id ON public.leave_balances(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_organization_id ON public.leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_performance_notes_organization_id ON public.performance_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_organization_id ON public.salary_advances(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_organization_id ON public.salary_records(organization_id);

-- Drop existing policies that don't properly scope by organization

-- Attendance policies
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON public.attendance;

-- Leave balances policies
DROP POLICY IF EXISTS "Admins can manage leave balances" ON public.leave_balances;
DROP POLICY IF EXISTS "Users can view their own leave balance" ON public.leave_balances;

-- Leave requests policies
DROP POLICY IF EXISTS "Admins can manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can create leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Users can view their own leave requests" ON public.leave_requests;

-- Performance notes policies
DROP POLICY IF EXISTS "Admins can manage performance notes" ON public.performance_notes;
DROP POLICY IF EXISTS "Users can view their own performance notes" ON public.performance_notes;

-- Salary advances policies
DROP POLICY IF EXISTS "Admins can manage salary advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Users can view their own salary advances" ON public.salary_advances;

-- Salary records policies  
DROP POLICY IF EXISTS "Admins can manage salary records" ON public.salary_records;
DROP POLICY IF EXISTS "Users can view their own salary records" ON public.salary_records;

-- Create new organization-scoped policies

-- Attendance policies
CREATE POLICY "Users can view org attendance"
ON public.attendance FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage attendance"
ON public.attendance FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can insert attendance in their org"
ON public.attendance FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Users can update their own attendance in org"
ON public.attendance FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND user_id = auth.uid()
);

-- Leave balances policies
CREATE POLICY "Users can view org leave balances"
ON public.leave_balances FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
  OR user_id = auth.uid()
);

CREATE POLICY "Org admins can manage leave balances"
ON public.leave_balances FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- Leave requests policies
CREATE POLICY "Users can view org leave requests"
ON public.leave_requests FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR user_id = auth.uid()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage leave requests"
ON public.leave_requests FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Users can create leave requests in their org"
ON public.leave_requests FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own pending leave requests"
ON public.leave_requests FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND user_id = auth.uid()
  AND status = 'pending'
);

-- Performance notes policies
CREATE POLICY "Users can view org performance notes"
ON public.performance_notes FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR user_id = auth.uid()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage performance notes"
ON public.performance_notes FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- Salary advances policies
CREATE POLICY "Users can view org salary advances"
ON public.salary_advances FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR user_id = auth.uid()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage salary advances"
ON public.salary_advances FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);

-- Salary records policies
CREATE POLICY "Users can view org salary records"
ON public.salary_records FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR user_id = auth.uid()
  OR is_platform_admin(auth.uid())
);

CREATE POLICY "Org admins can manage salary records"
ON public.salary_records FOR ALL
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);