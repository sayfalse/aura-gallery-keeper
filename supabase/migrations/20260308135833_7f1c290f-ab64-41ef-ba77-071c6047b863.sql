
CREATE TABLE public.pixel_ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memory_type text NOT NULL DEFAULT 'fact',
  content text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pixel_ai_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON public.pixel_ai_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.pixel_ai_memories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON public.pixel_ai_memories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.pixel_ai_memories FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.pixel_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text DEFAULT 'New Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pixel_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own conversations" ON public.pixel_ai_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
