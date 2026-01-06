-- Create enums for notification system
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp');
CREATE TYPE notification_type AS ENUM (
  'trial_started', 'trial_ending', 'trial_expired',
  'invoice_generated', 'payment_due_soon', 'payment_due_today', 'payment_overdue',
  'plan_activated', 'plan_expired', 'account_locked', 'account_unlocked',
  'payment_success', 'payment_failed'
);
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- Notification templates table
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  subject TEXT, -- For email
  body_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(notification_type, channel)
);

-- Organization notification settings
CREATE TABLE public.organization_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  timezone TEXT DEFAULT 'Asia/Dhaka',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, channel)
);

-- Organization notification type preferences
CREATE TABLE public.organization_notification_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, notification_type)
);

-- Notification logs table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  notification_type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  external_id TEXT, -- Gateway message ID
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scheduled reminders table
CREATE TABLE public.scheduled_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  reference_id TEXT, -- e.g., invoice_id, subscription_id
  reference_type TEXT, -- e.g., 'billing_invoice', 'subscription'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Global notification settings (for super admin)
CREATE TABLE public.global_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel notification_channel NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  provider_config JSONB DEFAULT '{}', -- API keys, endpoints (encrypted in practice)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_templates (super admin only can manage, all can view)
CREATE POLICY "Anyone can view active templates" ON public.notification_templates
  FOR SELECT USING (is_active = true);

-- RLS Policies for organization_notification_settings
CREATE POLICY "Org members can view their notification settings" ON public.organization_notification_settings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage notification settings" ON public.organization_notification_settings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for organization_notification_types
CREATE POLICY "Org members can view their notification type settings" ON public.organization_notification_types
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org owners can manage notification type settings" ON public.organization_notification_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for notification_logs
CREATE POLICY "Org members can view their notification logs" ON public.notification_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for scheduled_reminders
CREATE POLICY "Org members can view their scheduled reminders" ON public.scheduled_reminders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for global_notification_settings (super admin via service role)
CREATE POLICY "Service role can manage global settings" ON public.global_notification_settings
  FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_notification_logs_org_id ON public.notification_logs(organization_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX idx_scheduled_reminders_scheduled_for ON public.scheduled_reminders(scheduled_for);
CREATE INDEX idx_scheduled_reminders_is_processed ON public.scheduled_reminders(is_processed);

-- Insert default notification templates
INSERT INTO public.notification_templates (notification_type, channel, subject, body_template) VALUES
-- Trial reminders
('trial_started', 'email', 'Welcome to {{business_name}} - Your Trial Has Started!', 
  'Hi {{owner_name}},\n\nWelcome to our platform! Your 7-day free trial has started.\n\nExplore all features and see how we can help grow your business.\n\nBest regards,\nThe Team'),
('trial_ending', 'email', 'Your Trial Ends Tomorrow - Don''t Lose Access!',
  'Hi {{owner_name}},\n\nYour trial for {{business_name}} ends tomorrow.\n\nUpgrade now to continue enjoying all features without interruption.\n\nUpgrade here: {{payment_link}}\n\nBest regards,\nThe Team'),
('trial_expired', 'email', 'Your Trial Has Expired',
  'Hi {{owner_name}},\n\nYour trial period has ended. Your account features are now limited.\n\nUpgrade to restore full access: {{payment_link}}\n\nBest regards,\nThe Team'),

-- Billing reminders
('invoice_generated', 'email', 'Invoice #{{invoice_number}} Generated',
  'Hi {{owner_name}},\n\nYour invoice #{{invoice_number}} for {{amount}} BDT has been generated.\n\nDue date: {{due_date}}\n\nPay now: {{payment_link}}\n\nBest regards,\nThe Team'),
('payment_due_soon', 'email', 'Payment Due in 3 Days - Invoice #{{invoice_number}}',
  'Hi {{owner_name}},\n\nThis is a reminder that invoice #{{invoice_number}} for {{amount}} BDT is due in 3 days.\n\nPay now: {{payment_link}}\n\nBest regards,\nThe Team'),
('payment_due_today', 'email', 'Payment Due Today - Invoice #{{invoice_number}}',
  'Hi {{owner_name}},\n\nYour invoice #{{invoice_number}} for {{amount}} BDT is due today.\n\nPay now to avoid service interruption: {{payment_link}}\n\nBest regards,\nThe Team'),
('payment_overdue', 'email', 'OVERDUE: Invoice #{{invoice_number}}',
  'Hi {{owner_name}},\n\nYour invoice #{{invoice_number}} for {{amount}} BDT is overdue.\n\nPlease pay immediately to restore full access: {{payment_link}}\n\nBest regards,\nThe Team'),

-- Subscription status
('plan_activated', 'email', 'Your {{plan_name}} Plan is Now Active!',
  'Hi {{owner_name}},\n\nGreat news! Your {{plan_name}} plan for {{business_name}} is now active.\n\nEnjoy all the features!\n\nBest regards,\nThe Team'),
('plan_expired', 'email', 'Your Plan Has Expired',
  'Hi {{owner_name}},\n\nYour subscription plan has expired. Your account access is now limited.\n\nRenew now: {{payment_link}}\n\nBest regards,\nThe Team'),
('account_locked', 'email', 'Account Temporarily Locked',
  'Hi {{owner_name}},\n\nDue to payment issues, your account for {{business_name}} has been temporarily locked.\n\nResolve payment to restore access: {{payment_link}}\n\nBest regards,\nThe Team'),
('account_unlocked', 'email', 'Account Restored - Welcome Back!',
  'Hi {{owner_name}},\n\nYour account for {{business_name}} has been restored. Thank you for your payment!\n\nBest regards,\nThe Team'),

-- Payment notifications
('payment_success', 'email', 'Payment Received - Thank You!',
  'Hi {{owner_name}},\n\nWe received your payment of {{amount}} BDT for invoice #{{invoice_number}}.\n\nReceipt: {{receipt_link}}\n\nThank you for your business!\n\nBest regards,\nThe Team'),
('payment_failed', 'email', 'Payment Failed - Action Required',
  'Hi {{owner_name}},\n\nYour payment of {{amount}} BDT for invoice #{{invoice_number}} failed.\n\nPlease try again: {{payment_link}}\n\nBest regards,\nThe Team'),

-- SMS templates (shorter)
('trial_ending', 'sms', NULL, 'Your trial ends tomorrow! Upgrade now to keep access: {{payment_link}}'),
('payment_due_today', 'sms', NULL, 'Invoice #{{invoice_number}} ({{amount}} BDT) is due today. Pay: {{payment_link}}'),
('payment_overdue', 'sms', NULL, 'OVERDUE: Invoice #{{invoice_number}} for {{amount}} BDT. Pay now: {{payment_link}}'),

-- WhatsApp templates
('trial_ending', 'whatsapp', NULL, '⏰ Your trial ends tomorrow!\n\nUpgrade now to continue using all features.\n\n👉 {{payment_link}}'),
('payment_due_today', 'whatsapp', NULL, '📋 Invoice #{{invoice_number}}\n💰 Amount: {{amount}} BDT\n📅 Due: Today\n\n👉 Pay now: {{payment_link}}'),
('payment_overdue', 'whatsapp', NULL, '⚠️ OVERDUE\n📋 Invoice #{{invoice_number}}\n💰 Amount: {{amount}} BDT\n\nPay immediately: {{payment_link}}');

-- Insert default global settings
INSERT INTO public.global_notification_settings (channel, is_enabled, rate_limit_per_minute) VALUES
('email', true, 100),
('sms', true, 60),
('whatsapp', true, 30);

-- Function to render template with variables
CREATE OR REPLACE FUNCTION public.render_notification_template(
  template_text TEXT,
  variables JSONB
) RETURNS TEXT AS $$
DECLARE
  result TEXT := template_text;
  key TEXT;
  value TEXT;
BEGIN
  FOR key, value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := replace(result, '{{' || key || '}}', COALESCE(value, ''));
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create scheduled reminders for an organization
CREATE OR REPLACE FUNCTION public.schedule_trial_reminders(
  p_organization_id UUID,
  p_trial_ends_at TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  -- Day 3 reminder (trial started, 3 days after subscription creation)
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_started', p_trial_ends_at - INTERVAL '4 days', 'subscription')
  ON CONFLICT DO NOTHING;
  
  -- Day 6 reminder (trial ending tomorrow)
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_ending', p_trial_ends_at - INTERVAL '1 day', 'subscription')
  ON CONFLICT DO NOTHING;
  
  -- Day 7 (trial expired)
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_expired', p_trial_ends_at, 'subscription')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule billing reminders
CREATE OR REPLACE FUNCTION public.schedule_billing_reminders(
  p_organization_id UUID,
  p_invoice_id TEXT,
  p_due_date TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  -- Due in 3 days
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_id, reference_type)
  VALUES (p_organization_id, 'payment_due_soon', p_due_date - INTERVAL '3 days', p_invoice_id, 'billing_invoice')
  ON CONFLICT DO NOTHING;
  
  -- Due today
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_id, reference_type)
  VALUES (p_organization_id, 'payment_due_today', p_due_date, p_invoice_id, 'billing_invoice')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-schedule reminders when subscription is created
CREATE OR REPLACE FUNCTION public.auto_schedule_trial_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'trial' AND NEW.trial_ends_at IS NOT NULL THEN
    PERFORM public.schedule_trial_reminders(NEW.organization_id, NEW.trial_ends_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_schedule_trial_reminders
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_schedule_trial_reminders();

-- Trigger to auto-schedule billing reminders when invoice is created
CREATE OR REPLACE FUNCTION public.auto_schedule_billing_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.status = 'pending' THEN
    PERFORM public.schedule_billing_reminders(NEW.organization_id, NEW.id, NEW.due_date::TIMESTAMP WITH TIME ZONE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_schedule_billing_reminders
  AFTER INSERT ON public.billing_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_schedule_billing_reminders();