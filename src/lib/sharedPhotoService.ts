import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/photoService";
import type { Photo } from "@/types/photo";

export interface SharedPhoto extends Photo {
  sharedBy: string;
  sharedByUsername?: string;
  sharedAt: Date;
  connectionId: string;
  savedByRecipient: boolean;
}

export const fetchSharedWithMe = async (userId: string): Promise<SharedPhoto[]> => {
  const { data: connections, error: connErr } = await supabase
    .from("sharing_connections" as any)
    .select("id, owner_id")
    .eq("connected_user_id", userId)
    .eq("status", "accepted");

  if (connErr || !connections?.length) return [];

  const connectionIds = connections.map((c: any) => c.id);
  const ownerMap = new Map(connections.map((c: any) => [c.id, c.owner_id]));

  const { data: items, error: itemErr } = await supabase
    .from("shared_items" as any)
    .select("*")
    .in("connection_id", connectionIds)
    .eq("item_type", "photo")
    .order("created_at", { ascending: false });

  if (itemErr || !items?.length) return [];

  const photoIds = items.map((i: any) => i.item_id);
  const { data: photos, error: photoErr } = await supabase
    .from("photos")
    .select("*")
    .in("id", photoIds)
    .eq("deleted", false);

  if (photoErr) return [];

  const ownerIds = [...new Set(items.map((i: any) => i.shared_by))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, username" as any)
    .in("user_id", ownerIds);

  const profileMap = new Map(
    (profiles || []).map((p: any) => [p.user_id, p])
  );
  const photoMap = new Map(
    (photos || []).map((p: any) => [p.id, p])
  );

  const results = await Promise.all(
    items
      .map(async (item: any) => {
        const photo = photoMap.get(item.item_id);
        if (!photo) return null;
        const profile = profileMap.get(item.shared_by) as any;
        return {
          id: photo.id,
          src: await getSignedUrl(photo.storage_path),
          name: photo.name,
          date: new Date(photo.created_at),
          size: photo.size || "",
          favorite: false,
          storagePath: photo.storage_path,
          sharedBy: item.shared_by,
          sharedByUsername: profile?.username || profile?.display_name || "Unknown",
          sharedAt: new Date(item.created_at),
          connectionId: item.connection_id,
          savedByRecipient: item.saved_by_recipient,
        } as SharedPhoto;
      })
  );

  return results.filter(Boolean) as SharedPhoto[];
};

export const saveSharedPhoto = async (userId: string, photo: SharedPhoto): Promise<Photo> => {
  const { data: blob, error: dlErr } = await supabase.storage
    .from("photos")
    .download(photo.storagePath!);
  if (dlErr) throw dlErr;

  const ext = photo.name.split(".").pop() || "jpg";
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(storagePath, blob);
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("photos")
    .insert({
      user_id: userId,
      name: photo.name,
      storage_path: storagePath,
      size: photo.size,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("shared_items" as any)
    .update({ saved_by_recipient: true })
    .eq("item_id", photo.id)
    .eq("connection_id", photo.connectionId);

  return {
    id: data.id,
    src: await getSignedUrl(storagePath),
    name: data.name,
    date: new Date(data.created_at),
    size: data.size || "",
    favorite: false,
    storagePath: data.storage_path,
  };
};

// Share links
export const createShareLink = async (
  userId: string,
  itemType: "photo" | "album",
  itemId: string
): Promise<string> => {
  const { data, error } = await supabase
    .from("share_links" as any)
    .insert({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
    })
    .select()
    .single();

  if (error) throw error;
  return `${window.location.origin}/shared/${(data as any).token}`;
};

export const fetchShareLinkData = async (token: string) => {
  const { data: links, error } = await supabase
    .rpc("get_share_link_by_token", { _token: token });

  if (error || !links || (links as any[]).length === 0) throw new Error("Share link not found or expired");

  const l = (links as any[])[0];

  if (l.item_type === "photo") {
    const { data: photo, error: photoErr } = await supabase
      .from("photos")
      .select("*")
      .eq("id", l.item_id)
      .single();

    if (photoErr) throw new Error("Photo not found");
    return {
      type: "photo" as const,
      data: {
        id: photo.id,
        src: await getSignedUrl(photo.storage_path),
        name: photo.name,
        date: new Date(photo.created_at),
        size: photo.size || "",
      },
    };
  }

  if (l.item_type === "album") {
    const { data: album, error: albumErr } = await supabase
      .from("albums")
      .select("*")
      .eq("id", l.item_id)
      .single();

    if (albumErr) throw new Error("Album not found");

    const { data: albumPhotos } = await supabase
      .from("album_photos")
      .select("photo_id")
      .eq("album_id", l.item_id)
      .order("sort_order");

    const photoIds = (albumPhotos || []).map((ap: any) => ap.photo_id);
    const { data: photos } = await supabase
      .from("photos")
      .select("*")
      .in("id", photoIds)
      .eq("deleted", false);

    const photosWithUrls = await Promise.all(
      (photos || []).map(async (p: any) => ({
        id: p.id,
        src: await getSignedUrl(p.storage_path),
        name: p.name,
        date: new Date(p.created_at),
        size: p.size || "",
      }))
    );

    return {
      type: "album" as const,
      data: {
        name: album.name,
        description: album.description,
        photos: photosWithUrls,
      },
    };
  }

  throw new Error("Unknown share type");
};

export const getShareLinks = async (userId: string) => {
  const { data, error } = await supabase
    .from("share_links" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteShareLink = async (id: string) => {
  const { error } = await supabase
    .from("share_links" as any)
    .delete()
    .eq("id", id);
  if (error) throw error;
};
