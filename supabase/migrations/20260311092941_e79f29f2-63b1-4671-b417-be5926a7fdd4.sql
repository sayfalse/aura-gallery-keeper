-- Allow admins to INSERT, UPDATE, DELETE announcements
CREATE POLICY "Admins can insert announcements" ON public.announcements
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update announcements" ON public.announcements
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete announcements" ON public.announcements
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add an app_version table for update detection
CREATE TABLE IF NOT EXISTS public.app_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  download_url text,
  release_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app version" ON public.app_version
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage app version" ON public.app_version
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert initial version
INSERT INTO public.app_version (version, download_url, release_notes) 
VALUES ('4.0.0', 'https://github.com/sayfalse/pixelvault/releases', 'PixelVault v4.0.0 - Production release');