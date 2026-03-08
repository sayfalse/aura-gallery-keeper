-- Fix: Allow conversation creator to add initial members
DROP POLICY IF EXISTS "Users can add members" ON public.conversation_members;

CREATE POLICY "Users can add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversation_members.conversation_id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'admin'
  ))
);

-- Fix: Allow any member to update conversation updated_at (for last message timestamp)
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

CREATE POLICY "Members can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_members cm
    WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()
  )
);