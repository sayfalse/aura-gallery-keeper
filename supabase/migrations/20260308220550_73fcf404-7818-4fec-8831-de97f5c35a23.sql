
-- Vault files table
CREATE TABLE public.vault_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own vault files"
  ON public.vault_files
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Private storage bucket for vault
INSERT INTO storage.buckets (id, name, public) VALUES ('vault', 'vault', false);

CREATE POLICY "Users can upload vault files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own vault files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own vault files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
