-- Allow uploads to import folders (for scripts and imports)
CREATE POLICY "Allow uploads to import folders" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = 'import');
