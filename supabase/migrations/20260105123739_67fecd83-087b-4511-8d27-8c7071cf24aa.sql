-- Update task_status enum for production workflow
-- Add the new enum values
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'design';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'plate';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'printing';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'lamination';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'die_cutting';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'binding';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'packaging';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'delivered';

-- Add reference fields for linking to invoices/challans
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;