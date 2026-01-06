-- Add first_login_completed flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN first_login_completed boolean DEFAULT false;

-- Update existing users to have first_login_completed = true (they've already used the system)
UPDATE public.profiles SET first_login_completed = true WHERE first_login_completed IS NULL OR first_login_completed = false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.first_login_completed IS 'Flag to track if user has completed their first login welcome screen';