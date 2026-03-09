import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/photoService";
import type { Album } from "@/types/photo";

export const fetchAlbums = async (userId: string): Promise<Album[]> => {
  const { data: albums, error } = await supabase
    .from("albums")
    .select("*, album_photos(count), cover_photo:photos(storage_path)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const results = await Promise.all(
    (albums || []).map(async (a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description || undefined,
      coverPhotoUrl: a.cover_photo?.storage_path ? await getSignedUrl(a.cover_photo.storage_path) : undefined,
      photoCount: a.album_photos?.[0]?.count || 0,
      createdAt: new Date(a.created_at),
    }))
  );
  return results;
};

export const createAlbum = async (userId: string, name: string, description?: string): Promise<Album> => {
  const { data, error } = await supabase
    .from("albums")
    .insert({ user_id: userId, name, description })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    description: data.description || undefined,
    coverPhotoUrl: undefined,
    photoCount: 0,
    createdAt: new Date(data.created_at),
  };
};

export const deleteAlbum = async (id: string) => {
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) throw error;
};

export const renameAlbum = async (id: string, name: string) => {
  const { error } = await supabase.from("albums").update({ name }).eq("id", id);
  if (error) throw error;
};

export const addPhotosToAlbum = async (albumId: string, photoIds: string[]) => {
  // Get current max sort_order
  const { data: existing } = await supabase
    .from("album_photos")
    .select("sort_order")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
  const rows = photoIds.map((photo_id) => ({
    album_id: albumId,
    photo_id,
    sort_order: nextOrder++,
  }));
  const { error } = await supabase.from("album_photos").insert(rows);
  if (error) throw error;
};

export const removePhotoFromAlbum = async (albumId: string, photoId: string) => {
  const { error } = await supabase
    .from("album_photos")
    .delete()
    .eq("album_id", albumId)
    .eq("photo_id", photoId);
  if (error) throw error;
};

export const fetchAlbumPhotos = async (albumId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("album_photos")
    .select("photo_id")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map((r) => r.photo_id);
};

export const reorderAlbumPhotos = async (
  albumId: string,
  orderedPhotoIds: string[]
) => {
  // Update sort_order for each photo in the album
  const updates = orderedPhotoIds.map((photoId, index) =>
    supabase
      .from("album_photos")
      .update({ sort_order: index })
      .eq("album_id", albumId)
      .eq("photo_id", photoId)
  );
  await Promise.all(updates);
};

export const updateAlbumCover = async (albumId: string, photoId: string) => {
  const { error } = await supabase
    .from("albums")
    .update({ cover_photo_id: photoId })
    .eq("id", albumId);
  if (error) throw error;
};
