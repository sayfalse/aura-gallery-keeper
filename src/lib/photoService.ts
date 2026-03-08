import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "@/types/photo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const getPublicUrl = (storagePath: string) => {
  const { data } = supabase.storage.from("photos").getPublicUrl(storagePath);
  return data.publicUrl;
};

export const fetchPhotos = async (userId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    src: getPublicUrl(row.storage_path),
    name: row.name,
    date: new Date(row.created_at),
    size: row.size || "",
    favorite: row.favorite,
    album: row.album || undefined,
    storagePath: row.storage_path,
  }));
};

export const fetchDeletedPhotos = async (userId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .eq("deleted", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    src: getPublicUrl(row.storage_path),
    name: row.name,
    date: new Date(row.created_at),
    size: row.size || "",
    favorite: row.favorite,
    album: row.album || undefined,
    storagePath: row.storage_path,
  }));
};

export const uploadPhoto = async (userId: string, file: File): Promise<Photo> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const storagePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(storagePath, file);

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("photos")
    .insert({
      user_id: userId,
      name: file.name.replace(/\.[^/.]+$/, ""),
      storage_path: storagePath,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    src: getPublicUrl(storagePath),
    name: data.name,
    date: new Date(data.created_at),
    size: data.size || "",
    favorite: data.favorite,
    album: data.album || undefined,
    storagePath: data.storage_path,
  };
};

export const toggleFavorite = async (id: string, favorite: boolean) => {
  const { error } = await supabase
    .from("photos")
    .update({ favorite })
    .eq("id", id);
  if (error) throw error;
};

export const softDeletePhoto = async (id: string) => {
  const { error } = await supabase
    .from("photos")
    .update({ deleted: true })
    .eq("id", id);
  if (error) throw error;
};

export const restorePhoto = async (id: string) => {
  const { error } = await supabase
    .from("photos")
    .update({ deleted: false })
    .eq("id", id);
  if (error) throw error;
};

export const permanentlyDeletePhoto = async (id: string, storagePath: string) => {
  await supabase.storage.from("photos").remove([storagePath]);
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) throw error;
};
