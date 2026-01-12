-- Add 'urgent' value to the task_priority enum type
ALTER TYPE task_priority ADD VALUE IF NOT EXISTS 'urgent';