import { supabase } from "@/integrations/supabase/client";

export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  image: string;
  duration: number;
  url: string;
  year?: string;
  language?: string;
}

const invokeProxy = async (params: Record<string, string>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const queryStr = new URLSearchParams(params).toString();
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/music-proxy?${queryStr}`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
  return res.json();
};

const mapSong = (s: any): Song => ({
  id: s.id || "",
  name: s.name || s.title || "",
  artist: s.artist || "",
  album: s.album || "",
  image: s.image || "",
  duration: s.duration ? parseInt(s.duration) : 0,
  url: s.url || "",
  year: s.year || "",
  language: s.language || "",
});

export const searchSongs = async (query: string): Promise<Song[]> => {
  try {
    const data = await invokeProxy({ path: "search", query, limit: "20" });
    return (data.data?.results || []).map(mapSong);
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
};

export const getTrendingSongs = async (): Promise<Song[]> => {
  try {
    const data = await invokeProxy({ path: "search", query: "trending hits 2025", limit: "20" });
    return (data.data?.results || []).map(mapSong);
  } catch {
    return [];
  }
};

export const getSongDetails = async (id: string): Promise<Song | null> => {
  try {
    const data = await invokeProxy({ path: "song", id });
    if (data.data?.[0]) return mapSong(data.data[0]);
    return null;
  } catch {
    return null;
  }
};

export const getSongSuggestions = async (id: string): Promise<Song[]> => {
  try {
    const data = await invokeProxy({ path: "suggestions", id, limit: "10" });
    return (data.data || []).map(mapSong);
  } catch {
    return [];
  }
};

// Database operations
export const addToHistory = async (userId: string, song: Song) => {
  await supabase.from("music_history" as any).insert({
    user_id: userId,
    song_id: song.id,
    song_name: song.name,
    artist_name: song.artist,
    album_name: song.album,
    image_url: song.image,
    duration: song.duration,
    source_url: song.url,
  } as any);
};

export const getHistory = async (userId: string): Promise<Song[]> => {
  const { data } = await supabase
    .from("music_history" as any)
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(50);
  return (data || []).map((h: any) => ({
    id: h.song_id,
    name: h.song_name,
    artist: h.artist_name,
    album: h.album_name || "",
    image: h.image_url || "",
    duration: h.duration || 0,
    url: h.source_url || "",
  }));
};

export const addToFavorites = async (userId: string, song: Song) => {
  const { error } = await supabase.from("music_favorites" as any).insert({
    user_id: userId,
    song_id: song.id,
    song_name: song.name,
    artist_name: song.artist,
    album_name: song.album,
    image_url: song.image,
    duration: song.duration,
    source_url: song.url,
  } as any);
  return !error;
};

export const removeFromFavorites = async (userId: string, songId: string) => {
  await supabase.from("music_favorites" as any).delete().eq("user_id", userId).eq("song_id", songId);
};

export const getFavorites = async (userId: string): Promise<Song[]> => {
  const { data } = await supabase
    .from("music_favorites" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []).map((f: any) => ({
    id: f.song_id,
    name: f.song_name,
    artist: f.artist_name,
    album: f.album_name || "",
    image: f.image_url || "",
    duration: f.duration || 0,
    url: f.source_url || "",
  }));
};

export const isFavorite = async (userId: string, songId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("music_favorites" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("song_id", songId)
    .maybeSingle();
  return !!data;
};
