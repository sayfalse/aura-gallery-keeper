
-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for username lookups
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (lower(username));

-- Create sharing_connections table
CREATE TABLE public.sharing_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  connected_user_id uuid NOT NULL,
  auto_share boolean NOT NULL DEFAULT false,
  auto_save boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, connected_user_id)
);

-- Enable RLS
ALTER TABLE public.sharing_connections ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view connections they own or are connected to
CREATE POLICY "Users can view own connections"
  ON public.sharing_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connections"
  ON public.sharing_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own connections"
  ON public.sharing_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can delete own connections"
  ON public.sharing_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Create shared_items table for tracking what's shared
CREATE TABLE public.shared_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.sharing_connections(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  saved_by_recipient boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared items they sent or received"
  ON public.shared_items FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.sharing_connections sc
      WHERE sc.id = connection_id AND sc.connected_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shared items"
  ON public.shared_items FOR INSERT
  TO authenticated
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Recipients can update shared items"
  ON public.shared_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sharing_connections sc
      WHERE sc.id = connection_id AND sc.connected_user_id = auth.uid()
    )
  );

-- Update trigger for sharing_connections
CREATE TRIGGER update_sharing_connections_updated_at
  BEFORE UPDATE ON public.sharing_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow public lookup of usernames (for search)
CREATE POLICY "Anyone can search usernames"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
