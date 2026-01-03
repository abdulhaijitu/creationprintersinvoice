-- =============================================
-- HR Management Tables
-- =============================================

-- Leave Types
CREATE TYPE public.leave_type AS ENUM ('casual', 'sick', 'annual', 'other');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'half_day');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Attendance Table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leave Requests Table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leave Balances Table
CREATE TABLE public.leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  casual_total INTEGER DEFAULT 10,
  casual_used INTEGER DEFAULT 0,
  sick_total INTEGER DEFAULT 14,
  sick_used INTEGER DEFAULT 0,
  annual_total INTEGER DEFAULT 10,
  annual_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Salary Records Table
CREATE TABLE public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary DECIMAL(12, 2) NOT NULL,
  overtime_hours DECIMAL(5, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  bonus DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  advance DECIMAL(12, 2) DEFAULT 0,
  net_payable DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_salary_records_updated_at
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Salary Advances Table
CREATE TABLE public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  deducted_from_month INTEGER,
  deducted_from_year INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'deducted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- Performance Notes Table
CREATE TABLE public.performance_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_notes ENABLE ROW LEVEL SECURITY;

-- Tasks Table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES auth.users(id),
  deadline DATE,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'todo',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS Policies for HR Tables
-- =============================================

-- Attendance
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update attendance"
  ON public.attendance FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id);

-- Leave Requests
CREATE POLICY "Users can view their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage leave requests"
  ON public.leave_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Leave Balances
CREATE POLICY "Users can view their own leave balance"
  ON public.leave_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage leave balances"
  ON public.leave_balances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Salary Records
CREATE POLICY "Users can view their own salary"
  ON public.salary_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage salary records"
  ON public.salary_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Salary Advances
CREATE POLICY "Users can view their own advances"
  ON public.salary_advances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage advances"
  ON public.salary_advances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Performance Notes
CREATE POLICY "Users can view their own performance notes"
  ON public.performance_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage performance notes"
  ON public.performance_notes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Tasks
CREATE POLICY "Users can view assigned tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update assigned tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));