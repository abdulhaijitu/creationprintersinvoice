-- Fix function search path for security
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.schedule_trial_reminders(
  p_organization_id UUID,
  p_trial_ends_at TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_started', p_trial_ends_at - INTERVAL '4 days', 'subscription')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_ending', p_trial_ends_at - INTERVAL '1 day', 'subscription')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_type)
  VALUES (p_organization_id, 'trial_expired', p_trial_ends_at, 'subscription')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.schedule_billing_reminders(
  p_organization_id UUID,
  p_invoice_id TEXT,
  p_due_date TIMESTAMP WITH TIME ZONE
) RETURNS void AS $$
BEGIN
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_id, reference_type)
  VALUES (p_organization_id, 'payment_due_soon', p_due_date - INTERVAL '3 days', p_invoice_id, 'billing_invoice')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.scheduled_reminders (organization_id, notification_type, scheduled_for, reference_id, reference_type)
  VALUES (p_organization_id, 'payment_due_today', p_due_date, p_invoice_id, 'billing_invoice')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_schedule_trial_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'trial' AND NEW.trial_ends_at IS NOT NULL THEN
    PERFORM public.schedule_trial_reminders(NEW.organization_id, NEW.trial_ends_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_schedule_billing_reminders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.status = 'pending' THEN
    PERFORM public.schedule_billing_reminders(NEW.organization_id, NEW.id, NEW.due_date::TIMESTAMP WITH TIME ZONE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;