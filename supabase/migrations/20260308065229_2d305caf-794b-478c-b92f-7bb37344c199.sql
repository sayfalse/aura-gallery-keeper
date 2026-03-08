
-- Albums table
CREATE TABLE public.albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own albums" ON public.albums FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own albums" ON public.albums FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own albums" ON public.albums FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own albums" ON public.albums FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Album-photos junction table
CREATE TABLE public.album_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(album_id, photo_id)
);

ALTER TABLE public.album_photos ENABLE ROW LEVEL SECURITY;

-- Use a security definer function to check album ownership
CREATE OR REPLACE FUNCTION public.owns_album(_user_id uuid, _album_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.albums WHERE id = _album_id AND user_id = _user_id
  )
$$;

CREATE POLICY "Users can view their album photos" ON public.album_photos FOR SELECT USING (public.owns_album(auth.uid(), album_id));
CREATE POLICY "Users can add photos to their albums" ON public.album_photos FOR INSERT WITH CHECK (public.owns_album(auth.uid(), album_id));
CREATE POLICY "Users can remove photos from their albums" ON public.album_photos FOR DELETE USING (public.owns_album(auth.uid(), album_id));
