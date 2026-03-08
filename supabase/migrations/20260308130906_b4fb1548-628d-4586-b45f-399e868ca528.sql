
-- Conversations table (supports 1-on-1 and group chats)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel')),
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conversation members
CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  file_url TEXT,
  file_name TEXT,
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view conversations they're members of
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid()
  ));

-- RLS: Authenticated users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: Admins can update conversations
CREATE POLICY "Admins can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid() AND cm.role = 'admin'
  ));

-- RLS: Members can view membership
CREATE POLICY "Users can view conversation members"
  ON public.conversation_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm2
    WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid()
  ));

-- RLS: Users can add members (if admin or creating new conversation)
CREATE POLICY "Users can add members"
  ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- RLS: Users can update their own membership (e.g. last_read_at)
CREATE POLICY "Users can update own membership"
  ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- RLS: Users can leave conversations
CREATE POLICY "Users can leave conversations"
  ON public.conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: Members can view messages in their conversations
CREATE POLICY "Users can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
  ));

-- RLS: Members can send messages
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_members cm
      WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid()
    )
  );

-- RLS: Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- RLS: Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;

-- Trigger for updated_at
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
