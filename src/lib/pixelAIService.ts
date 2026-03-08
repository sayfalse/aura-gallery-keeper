import { supabase } from "@/integrations/supabase/client";

export interface AIMemory {
  id: string;
  user_id: string;
  memory_type: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

// Memory operations
export const getMemories = async (userId: string): Promise<AIMemory[]> => {
  const { data } = await supabase
    .from("pixel_ai_memories" as any)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data || []) as any;
};

export const addMemory = async (userId: string, content: string, category = "general", memoryType = "fact") => {
  const { error } = await supabase.from("pixel_ai_memories" as any).insert({
    user_id: userId,
    content,
    category,
    memory_type: memoryType,
  } as any);
  return !error;
};

export const deleteMemory = async (memoryId: string) => {
  await supabase.from("pixel_ai_memories" as any).delete().eq("id", memoryId);
};

export const clearAllMemories = async (userId: string) => {
  await supabase.from("pixel_ai_memories" as any).delete().eq("user_id", userId);
};

// Conversation operations
export const getConversations = async (userId: string): Promise<AIConversation[]> => {
  const { data } = await supabase
    .from("pixel_ai_conversations" as any)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data || []) as any;
};

export const saveConversation = async (userId: string, title: string, messages: any[]) => {
  const { data, error } = await supabase.from("pixel_ai_conversations" as any).insert({
    user_id: userId,
    title,
    messages: JSON.stringify(messages),
  } as any).select().single();
  return data as any;
};

export const updateConversation = async (id: string, messages: any[], title?: string) => {
  const update: any = { messages: JSON.stringify(messages), updated_at: new Date().toISOString() };
  if (title) update.title = title;
  await supabase.from("pixel_ai_conversations" as any).update(update).eq("id", id);
};

export const deleteConversation = async (id: string) => {
  await supabase.from("pixel_ai_conversations" as any).delete().eq("id", id);
};

// Format memories as context for AI
export const formatMemoriesForContext = (memories: AIMemory[]): string => {
  if (memories.length === 0) return "";
  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    const cat = m.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m.content);
  }
  let ctx = "## User's Saved Memories\n";
  for (const [cat, items] of Object.entries(grouped)) {
    ctx += `\n### ${cat}\n`;
    for (const item of items) ctx += `- ${item}\n`;
  }
  return ctx;
};
