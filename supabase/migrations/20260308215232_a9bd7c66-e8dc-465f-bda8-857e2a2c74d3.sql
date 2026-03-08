
-- Browser history table
CREATE TABLE public.browser_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  favicon_url text,
  visited_at timestamptz DEFAULT now()
);

ALTER TABLE public.browser_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own browser history"
  ON public.browser_history FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_browser_history_user ON public.browser_history(user_id, visited_at DESC);

-- Browser bookmarks table
CREATE TABLE public.browser_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  favicon_url text,
  folder text DEFAULT '/',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.browser_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bookmarks"
  ON public.browser_bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_browser_bookmarks_user ON public.browser_bookmarks(user_id, created_at DESC);

-- Browser downloads table
CREATE TABLE public.browser_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.browser_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own downloads"
  ON public.browser_downloads FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_browser_downloads_user ON public.browser_downloads(user_id, created_at DESC);
