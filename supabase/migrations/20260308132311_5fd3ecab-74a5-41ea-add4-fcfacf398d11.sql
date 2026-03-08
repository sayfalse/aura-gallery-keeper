
-- Music listening history
CREATE TABLE public.music_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id text NOT NULL,
  song_name text NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  album_name text DEFAULT '',
  image_url text DEFAULT '',
  duration integer DEFAULT 0,
  source_url text DEFAULT '',
  played_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.music_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own history" ON public.music_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.music_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.music_history FOR DELETE USING (auth.uid() = user_id);

-- Music favorites
CREATE TABLE public.music_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  song_id text NOT NULL,
  song_name text NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  album_name text DEFAULT '',
  image_url text DEFAULT '',
  duration integer DEFAULT 0,
  source_url text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);
ALTER TABLE public.music_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own favorites" ON public.music_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.music_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.music_favorites FOR DELETE USING (auth.uid() = user_id);

-- Music playlists
CREATE TABLE public.music_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  cover_url text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own playlists" ON public.music_playlists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Playlist songs
CREATE TABLE public.music_playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  song_id text NOT NULL,
  song_name text NOT NULL,
  artist_name text NOT NULL DEFAULT '',
  album_name text DEFAULT '',
  image_url text DEFAULT '',
  duration integer DEFAULT 0,
  source_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  added_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.music_playlist_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own playlist songs" ON public.music_playlist_songs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.music_playlists WHERE id = playlist_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own playlist songs" ON public.music_playlist_songs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.music_playlists WHERE id = playlist_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own playlist songs" ON public.music_playlist_songs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.music_playlists WHERE id = playlist_id AND user_id = auth.uid())
);
