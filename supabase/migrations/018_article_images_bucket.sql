-- Create article-images storage bucket for article cover photos and inline images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload
CREATE POLICY "article_images_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images');

-- Authenticated users can overwrite/delete
CREATE POLICY "article_images_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images');

CREATE POLICY "article_images_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images');

-- Public can read (bucket is public)
CREATE POLICY "article_images_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'article-images');
