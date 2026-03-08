
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_message_id bigint,
  title text,
  content text NOT NULL,
  author text DEFAULT 'Aura Team',
  type text DEFAULT 'update' CHECK (type IN ('update', 'announcement', 'maintenance', 'feature')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read announcements
CREATE POLICY "Anyone can read announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
