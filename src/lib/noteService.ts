import { supabase } from "@/integrations/supabase/client";

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const fetchNotes = async (userId: string): Promise<Note[]> => {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    folder: r.folder || "General",
    pinned: r.pinned,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
};

export const createNote = async (userId: string, title: string, content: string, folder: string = "General"): Promise<Note> => {
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: userId, title, content, folder })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    folder: data.folder || "General",
    pinned: data.pinned,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
};

export const updateNote = async (id: string, updates: { title?: string; content?: string; folder?: string; pinned?: boolean }) => {
  const { error } = await supabase.from("notes").update(updates).eq("id", id);
  if (error) throw error;
};

export const deleteNote = async (id: string) => {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
};
