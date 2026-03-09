-- Drop the existing INSERT policy that allows self-joining
DROP POLICY IF EXISTS "Users can add members" ON public.conversation_members;

-- Create a new INSERT policy: only conversation creator or existing admin can add members
CREATE POLICY "Users can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- The conversation creator can add members
  (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_members.conversation_id
      AND c.created_by = auth.uid()
  ))
  OR
  -- An existing admin of the conversation can add members
  (EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
  ))
);