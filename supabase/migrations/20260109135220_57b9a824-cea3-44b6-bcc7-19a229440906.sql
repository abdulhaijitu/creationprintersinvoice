-- Add new status values to the quotation_status enum
ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'pending';
ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'sent' AFTER 'draft';
ALTER TYPE quotation_status ADD VALUE IF NOT EXISTS 'converted' AFTER 'accepted';