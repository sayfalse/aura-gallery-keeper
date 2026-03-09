import { supabase } from "@/integrations/supabase/client";
import type { Photo } from "@/types/photo";

export const getSignedUrl = async (storagePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(storagePath, 3600); // 1 hour expiry
  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return "";
  }
  return data.signedUrl;
};

export const fetchPhotos = async (userId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .eq("deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const photos = await Promise.all(
    (data || []).map(async (row) => ({
      id: row.id,
      src: await getSignedUrl(row.storage_path),
      name: row.name,
      date: new Date(row.created_at),
      size: row.size || "",
      favorite: row.favorite,
      album: row.album || undefined,
      storagePath: row.storage_path,
    }))
  );
  return photos;
};

export const fetchDeletedPhotos = async (userId: string): Promise<Photo[]> => {
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("user_id", userId)
    .eq("deleted", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const photos = await Promise.all(
    (data || []).map(async (row) => ({
      id: row.id,
      src: await getSignedUrl(row.storage_path),
      name: row.name,
      date: new Date(row.created_at),
      size: row.size || "",
      favorite: row.favorite,
      album: row.album || undefined,
      storagePath: row.storage_path,
    }))
  );
  return photos;
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
    src: await getSignedUrl(storagePath),
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
