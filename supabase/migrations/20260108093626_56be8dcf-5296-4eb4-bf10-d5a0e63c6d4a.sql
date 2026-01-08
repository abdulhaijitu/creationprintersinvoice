-- Onboarding analytics table
CREATE TABLE public.onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    user_role TEXT NOT NULL,
    step_key TEXT NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, started, completed, skipped
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    skipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id, step_key)
);

-- Onboarding completion summary per user
CREATE TABLE public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    user_role TEXT NOT NULL,
    total_steps INTEGER NOT NULL DEFAULT 0,
    completed_steps INTEGER NOT NULL DEFAULT 0,
    skipped_steps INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Demo data tracking table
CREATE TABLE public.demo_data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    cleanup_after TIMESTAMP WITH TIME ZONE,
    cleanup_on_first_real_data BOOLEAN NOT NULL DEFAULT false
);

-- Demo data cleanup logs
CREATE TABLE public.demo_cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    cleaned_by UUID,
    records_deleted INTEGER NOT NULL DEFAULT 0,
    cleanup_reason TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Walkthrough dismissals (track what user has seen)
CREATE TABLE public.walkthrough_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    walkthrough_key TEXT NOT NULL,
    dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, walkthrough_key)
);

-- Enable RLS
ALTER TABLE public.onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_cleanup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walkthrough_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_analytics
CREATE POLICY "Users can view own onboarding analytics"
ON public.onboarding_analytics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding analytics"
ON public.onboarding_analytics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding analytics"
ON public.onboarding_analytics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all onboarding analytics"
ON public.onboarding_analytics FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- RLS Policies for onboarding_progress
CREATE POLICY "Users can view own onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
ON public.onboarding_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
ON public.onboarding_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all onboarding progress"
ON public.onboarding_progress FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- RLS Policies for demo_data_records
CREATE POLICY "Org members can view demo data records"
ON public.demo_data_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = demo_data_records.organization_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Super admins can manage demo data records"
ON public.demo_data_records FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- RLS Policies for demo_cleanup_logs
CREATE POLICY "Org owners can view cleanup logs"
ON public.demo_cleanup_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = demo_cleanup_logs.organization_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
);

CREATE POLICY "Super admins can view all cleanup logs"
ON public.demo_cleanup_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- RLS Policies for walkthrough_dismissals
CREATE POLICY "Users can manage own walkthrough dismissals"
ON public.walkthrough_dismissals FOR ALL
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_onboarding_analytics_org ON public.onboarding_analytics(organization_id);
CREATE INDEX idx_onboarding_analytics_user ON public.onboarding_analytics(user_id);
CREATE INDEX idx_onboarding_progress_org ON public.onboarding_progress(organization_id);
CREATE INDEX idx_demo_data_records_org ON public.demo_data_records(organization_id);
CREATE INDEX idx_demo_data_records_cleanup ON public.demo_data_records(cleanup_after) WHERE cleanup_after IS NOT NULL;

-- Enable realtime for onboarding progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_analytics;