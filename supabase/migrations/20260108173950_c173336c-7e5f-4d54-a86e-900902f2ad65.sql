-- Add new roles to org_role enum: sales_staff, designer, employee
-- Note: PostgreSQL allows adding values to enums but not removing them safely

-- Add 'sales_staff' if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sales_staff' AND enumtypid = 'org_role'::regtype) THEN
    ALTER TYPE org_role ADD VALUE 'sales_staff';
  END IF;
END $$;

-- Add 'designer' if not exists  
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'designer' AND enumtypid = 'org_role'::regtype) THEN
    ALTER TYPE org_role ADD VALUE 'designer';
  END IF;
END $$;

-- Add 'employee' if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'employee' AND enumtypid = 'org_role'::regtype) THEN
    ALTER TYPE org_role ADD VALUE 'employee';
  END IF;
END $$;