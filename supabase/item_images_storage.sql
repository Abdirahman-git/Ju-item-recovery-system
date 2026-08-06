-- Supabase Storage bucket for item photos
-- Run in Supabase Dashboard → SQL Editor (after creating bucket in UI if needed)

INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anon uploads/reads for this dev app (no Supabase Auth session)
CREATE POLICY IF NOT EXISTS "item_images_public_read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'item-images');

CREATE POLICY IF NOT EXISTS "item_images_anon_upload"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'item-images');

CREATE POLICY IF NOT EXISTS "item_images_anon_update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'item-images');

CREATE POLICY IF NOT EXISTS "item_images_anon_delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'item-images');
