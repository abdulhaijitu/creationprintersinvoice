-- Subscription Events table for tracking MRR changes, churn, conversions
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('trial_start', 'trial_end', 'conversion', 'upgrade', 'downgrade', 'churn', 'reactivation', 'renewal')),
  from_plan TEXT,
  to_plan TEXT,
  mrr_change NUMERIC DEFAULT 0,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plan Pricing table for accurate MRR calculation
CREATE TABLE public.plan_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL UNIQUE,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  annual_price NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default plan pricing
INSERT INTO public.plan_pricing (plan_name, monthly_price, annual_price) VALUES
  ('free', 0, 0),
  ('basic', 999, 9990),
  ('pro', 2499, 24990),
  ('enterprise', 4999, 49990);

-- Revenue Snapshots for historical tracking
CREATE TABLE public.revenue_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_mrr NUMERIC NOT NULL DEFAULT 0,
  total_arr NUMERIC NOT NULL DEFAULT 0,
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  trial_subscriptions INTEGER NOT NULL DEFAULT 0,
  churned_subscriptions INTEGER NOT NULL DEFAULT 0,
  new_subscriptions INTEGER NOT NULL DEFAULT 0,
  expansion_revenue NUMERIC DEFAULT 0,
  contraction_revenue NUMERIC DEFAULT 0,
  plan_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_snapshot_date UNIQUE (snapshot_date)
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing is_platform_admin function
CREATE POLICY "Super admin can view subscription events" 
ON public.subscription_events FOR SELECT 
USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can insert subscription events" 
ON public.subscription_events FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view plan pricing" 
ON public.plan_pricing FOR SELECT 
USING (true);

CREATE POLICY "Super admin can manage plan pricing" 
ON public.plan_pricing FOR ALL 
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Super admin can view revenue snapshots" 
ON public.revenue_snapshots FOR SELECT 
USING (is_platform_admin(auth.uid()));

CREATE POLICY "System can manage revenue snapshots" 
ON public.revenue_snapshots FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX idx_subscription_events_org ON public.subscription_events(organization_id);
CREATE INDEX idx_subscription_events_date ON public.subscription_events(event_date DESC);
CREATE INDEX idx_subscription_events_type ON public.subscription_events(event_type);
CREATE INDEX idx_revenue_snapshots_date ON public.revenue_snapshots(snapshot_date DESC);

-- Function to calculate current SaaS metrics
CREATE OR REPLACE FUNCTION public.calculate_saas_metrics(
  start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  current_mrr NUMERIC := 0;
  current_arr NUMERIC := 0;
  active_paid INTEGER := 0;
  active_trial INTEGER := 0;
  total_active INTEGER := 0;
  arpu NUMERIC := 0;
  churn_count INTEGER := 0;
  churn_rate NUMERIC := 0;
  conversion_count INTEGER := 0;
  trial_count_period INTEGER := 0;
  conversion_rate NUMERIC := 0;
  new_orgs_count INTEGER := 0;
  prev_mrr NUMERIC := 0;
  mrr_growth NUMERIC := 0;
  expansion_mrr NUMERIC := 0;
  plan_revenue JSONB := '{}';
BEGIN
  -- Calculate current MRR from active subscriptions
  SELECT COALESCE(SUM(pp.monthly_price), 0), COUNT(*)
  INTO current_mrr, active_paid
  FROM subscriptions s
  JOIN plan_pricing pp ON s.plan::TEXT = pp.plan_name
  WHERE s.status = 'active' AND s.plan != 'free';
  
  -- Count trial subscriptions
  SELECT COUNT(*) INTO active_trial
  FROM subscriptions
  WHERE status = 'trial';
  
  total_active := active_paid + active_trial;
  current_arr := current_mrr * 12;
  
  -- ARPU calculation
  IF active_paid > 0 THEN
    arpu := current_mrr / active_paid;
  END IF;
  
  -- Churn calculation
  SELECT COUNT(*) INTO churn_count
  FROM subscription_events
  WHERE event_type = 'churn'
  AND event_date BETWEEN start_date AND end_date;
  
  IF total_active + churn_count > 0 THEN
    churn_rate := (churn_count::NUMERIC / (total_active + churn_count)) * 100;
  END IF;
  
  -- Conversion rate
  SELECT COUNT(*) INTO conversion_count
  FROM subscription_events
  WHERE event_type = 'conversion'
  AND event_date BETWEEN start_date AND end_date;
  
  SELECT COUNT(*) INTO trial_count_period
  FROM subscription_events
  WHERE event_type = 'trial_start'
  AND event_date BETWEEN start_date AND end_date;
  
  IF trial_count_period > 0 THEN
    conversion_rate := (conversion_count::NUMERIC / trial_count_period) * 100;
  END IF;
  
  -- New organizations this period
  SELECT COUNT(*) INTO new_orgs_count
  FROM organizations
  WHERE created_at::DATE BETWEEN start_date AND end_date;
  
  -- MRR Growth
  SELECT total_mrr INTO prev_mrr
  FROM revenue_snapshots
  WHERE snapshot_date = start_date
  LIMIT 1;
  
  IF prev_mrr > 0 THEN
    mrr_growth := ((current_mrr - prev_mrr) / prev_mrr) * 100;
  END IF;
  
  -- Expansion revenue
  SELECT COALESCE(SUM(mrr_change), 0) INTO expansion_mrr
  FROM subscription_events
  WHERE event_type = 'upgrade'
  AND event_date BETWEEN start_date AND end_date;
  
  -- Revenue by plan
  SELECT jsonb_object_agg(
    plan_name,
    jsonb_build_object('count', count, 'revenue', revenue)
  ) INTO plan_revenue
  FROM (
    SELECT 
      pp.plan_name,
      COUNT(s.id) as count,
      COALESCE(SUM(pp.monthly_price), 0) as revenue
    FROM plan_pricing pp
    LEFT JOIN subscriptions s ON s.plan::TEXT = pp.plan_name AND s.status = 'active'
    GROUP BY pp.plan_name
  ) t;
  
  result := jsonb_build_object(
    'mrr', current_mrr,
    'arr', current_arr,
    'arpu', ROUND(arpu, 2),
    'active_paid', active_paid,
    'active_trial', active_trial,
    'total_active', total_active,
    'churn_count', churn_count,
    'churn_rate', ROUND(churn_rate, 2),
    'conversion_count', conversion_count,
    'conversion_rate', ROUND(conversion_rate, 2),
    'new_organizations', new_orgs_count,
    'mrr_growth', ROUND(mrr_growth, 2),
    'expansion_revenue', expansion_mrr,
    'plan_breakdown', plan_revenue,
    'period_start', start_date,
    'period_end', end_date,
    'calculated_at', now()
  );
  
  RETURN result;
END;
$$;

-- Function to get MRR trend
CREATE OR REPLACE FUNCTION public.get_mrr_trend(days_back INTEGER DEFAULT 30)
RETURNS TABLE(snapshot_date DATE, mrr NUMERIC, arr NUMERIC, active_subscriptions INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.snapshot_date,
    rs.total_mrr as mrr,
    rs.total_arr as arr,
    rs.active_subscriptions
  FROM revenue_snapshots rs
  WHERE rs.snapshot_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
  ORDER BY rs.snapshot_date ASC;
END;
$$;

-- Trigger to log subscription events
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_price NUMERIC := 0;
  new_price NUMERIC := 0;
  mrr_diff NUMERIC := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.plan IS DISTINCT FROM NEW.plan THEN
    SELECT monthly_price INTO old_price FROM plan_pricing WHERE plan_name = OLD.plan::TEXT;
    SELECT monthly_price INTO new_price FROM plan_pricing WHERE plan_name = NEW.plan::TEXT;
    mrr_diff := COALESCE(new_price, 0) - COALESCE(old_price, 0);
    
    IF new_price > old_price THEN
      INSERT INTO subscription_events (organization_id, event_type, from_plan, to_plan, mrr_change)
      VALUES (NEW.organization_id, 'upgrade', OLD.plan::TEXT, NEW.plan::TEXT, mrr_diff);
    ELSIF new_price < old_price THEN
      INSERT INTO subscription_events (organization_id, event_type, from_plan, to_plan, mrr_change)
      VALUES (NEW.organization_id, 'downgrade', OLD.plan::TEXT, NEW.plan::TEXT, mrr_diff);
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'trial' AND NEW.status = 'active' THEN
      SELECT monthly_price INTO new_price FROM plan_pricing WHERE plan_name = NEW.plan::TEXT;
      INSERT INTO subscription_events (organization_id, event_type, to_plan, mrr_change)
      VALUES (NEW.organization_id, 'conversion', NEW.plan::TEXT, COALESCE(new_price, 0));
    ELSIF NEW.status = 'expired' OR NEW.status = 'cancelled' THEN
      SELECT monthly_price INTO old_price FROM plan_pricing WHERE plan_name = OLD.plan::TEXT;
      INSERT INTO subscription_events (organization_id, event_type, from_plan, mrr_change)
      VALUES (NEW.organization_id, 'churn', OLD.plan::TEXT, -COALESCE(old_price, 0));
    ELSIF OLD.status IN ('expired', 'cancelled') AND NEW.status = 'active' THEN
      SELECT monthly_price INTO new_price FROM plan_pricing WHERE plan_name = NEW.plan::TEXT;
      INSERT INTO subscription_events (organization_id, event_type, to_plan, mrr_change)
      VALUES (NEW.organization_id, 'reactivation', NEW.plan::TEXT, COALESCE(new_price, 0));
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.status = 'trial' THEN
    INSERT INTO subscription_events (organization_id, event_type, to_plan)
    VALUES (NEW.organization_id, 'trial_start', NEW.plan::TEXT);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscription_change_trigger
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_subscription_change();

-- Update timestamp trigger for plan_pricing
CREATE TRIGGER update_plan_pricing_updated_at
BEFORE UPDATE ON public.plan_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();