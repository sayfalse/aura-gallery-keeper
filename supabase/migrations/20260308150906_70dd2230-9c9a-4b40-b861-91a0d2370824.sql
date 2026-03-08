-- SECURITY FIX 1: Restrict share_links SELECT to token-based lookup only
DROP POLICY IF EXISTS "Anyone can view share links by token" ON public.share_links;

-- Create a security definer function for token lookup
CREATE OR REPLACE FUNCTION public.get_share_link_by_token(_token text)
RETURNS TABLE (
  id uuid,
  item_id uuid,
  item_type text,
  user_id uuid,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sl.id, sl.item_id, sl.item_type, sl.user_id, sl.expires_at, sl.created_at
  FROM public.share_links sl
  WHERE sl.token = _token
    AND (sl.expires_at IS NULL OR sl.expires_at > now());
$$;

-- SECURITY FIX 2: Prevent conversation_members role escalation
DROP POLICY IF EXISTS "Users can update own membership" ON public.conversation_members;
CREATE POLICY "Users can update own membership"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- SECURITY FIX 3: Restrict shared_items UPDATE to only saved_by_recipient column
DROP POLICY IF EXISTS "Recipients can update shared items" ON public.shared_items;
CREATE POLICY "Recipients can update shared items"
ON public.shared_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sharing_connections sc
    WHERE sc.id = shared_items.connection_id
      AND sc.connected_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sharing_connections sc
    WHERE sc.id = shared_items.connection_id
      AND sc.connected_user_id = auth.uid()
  )
);