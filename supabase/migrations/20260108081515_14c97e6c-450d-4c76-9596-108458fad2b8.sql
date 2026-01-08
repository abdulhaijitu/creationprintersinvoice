-- Fix 1: Make invoice_number unique per organization (not globally)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_invoice_number_org_unique ON public.invoices(organization_id, invoice_number);

-- Add invoice_sequences table for per-org atomic sequence generation
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  prefix TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view their invoice sequence" 
  ON public.invoice_sequences FOR SELECT 
  USING (public.user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage invoice sequence" 
  ON public.invoice_sequences FOR ALL 
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Create function to generate unique invoice number per org (atomic)
CREATE OR REPLACE FUNCTION public.generate_org_invoice_number(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sequence INTEGER;
  v_prefix TEXT;
  v_year TEXT;
BEGIN
  -- Insert or update sequence atomically
  INSERT INTO public.invoice_sequences (organization_id, current_sequence, prefix)
  VALUES (p_org_id, 1, '')
  ON CONFLICT (organization_id) 
  DO UPDATE SET 
    current_sequence = invoice_sequences.current_sequence + 1,
    updated_at = now()
  RETURNING current_sequence, prefix INTO v_sequence, v_prefix;
  
  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Return formatted invoice number
  RETURN COALESCE(NULLIF(v_prefix, ''), '') || v_year || LPAD(v_sequence::TEXT, 4, '0');
END;
$function$;

-- Fix 2: Support Tickets System
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Generate ticket number function
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_year TEXT;
  v_next INTEGER;
BEGIN
  v_year := 'TKT' || to_char(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 8) AS INTEGER)), 0) + 1
  INTO v_next
  FROM public.support_tickets
  WHERE ticket_number LIKE v_year || '%';
  RETURN v_year || LPAD(v_next::TEXT, 5, '0');
END;
$function$;

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Ticket policies
CREATE POLICY "Users can view their own tickets" 
  ON public.support_tickets FOR SELECT 
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Users can create tickets" 
  ON public.support_tickets FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets" 
  ON public.support_tickets FOR UPDATE 
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- Message policies  
CREATE POLICY "Users can view messages in their tickets" 
  ON public.support_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can send messages to their tickets" 
  ON public.support_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets t 
      WHERE t.id = ticket_id 
      AND (t.user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
    )
  );

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at DESC);