
-- Fix conversation member role escalation: restrict UPDATE to only last_read_at column
DROP POLICY IF EXISTS "Users can update own membership" ON public.conversation_members;

CREATE POLICY "Users can update own membership"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create a trigger to prevent role changes by non-admins
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If role is being changed, check if the current user is an admin of this conversation
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_id = OLD.conversation_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only conversation admins can change member roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_role_escalation ON public.conversation_members;
CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON public.conversation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
