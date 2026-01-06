-- Create branding storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for branding storage
CREATE POLICY "Users can view all branding assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'branding');

CREATE POLICY "Org owners can upload branding assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'branding' AND
  auth.uid() IN (
    SELECT om.user_id 
    FROM public.organization_members om 
    WHERE om.role = 'owner'
  )
);

CREATE POLICY "Org owners can update branding assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'branding' AND
  auth.uid() IN (
    SELECT om.user_id 
    FROM public.organization_members om 
    WHERE om.role = 'owner'
  )
);

CREATE POLICY "Org owners can delete branding assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'branding' AND
  auth.uid() IN (
    SELECT om.user_id 
    FROM public.organization_members om 
    WHERE om.role = 'owner'
  )
);