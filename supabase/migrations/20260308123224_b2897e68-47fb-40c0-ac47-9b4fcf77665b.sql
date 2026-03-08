
-- Create share_links table for public URL sharing
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own share links"
  ON public.share_links FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous access to share links for public viewing
CREATE POLICY "Anyone can view share links by token"
  ON public.share_links FOR SELECT
  TO anon
  USING (true);

-- Function to auto-share items with connected users
CREATE OR REPLACE FUNCTION public.auto_share_on_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.shared_items (connection_id, item_type, item_id, shared_by)
  SELECT sc.id, TG_ARGV[0], NEW.id, NEW.user_id
  FROM public.sharing_connections sc
  WHERE sc.owner_id = NEW.user_id
    AND sc.auto_share = true
    AND sc.status = 'accepted';
  RETURN NEW;
END;
$$;

-- Trigger for auto-sharing photos
CREATE TRIGGER auto_share_photo
  AFTER INSERT ON public.photos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_share_on_upload('photo');

-- Trigger for auto-sharing drive files
CREATE TRIGGER auto_share_drive_file
  AFTER INSERT ON public.drive_files
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_share_on_upload('file');
