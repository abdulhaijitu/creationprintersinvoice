-- Add impersonate_start and impersonate_end to audit_action_type enum
ALTER TYPE public.audit_action_type ADD VALUE IF NOT EXISTS 'impersonate_start';
ALTER TYPE public.audit_action_type ADD VALUE IF NOT EXISTS 'impersonate_end';