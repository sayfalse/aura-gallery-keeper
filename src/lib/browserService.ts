import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const getProxyUrl = (url: string): string => {
  return `${SUPABASE_URL}/functions/v1/web-proxy`;
};


export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isActive: boolean;
  isLoading: boolean;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string | null;
  favicon_url: string | null;
  visited_at: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  folder: string;
  created_at: string;
}

export interface DownloadEntry {
  id: string;
  url: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  created_at: string;
}

// History
export const addHistoryEntry = async (userId: string, url: string, title?: string) => {
  await supabase.from("browser_history").insert({
    user_id: userId,
    url,
    title: title || url,
    favicon_url: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
  });
};

export const fetchHistory = async (userId: string, limit = 100): Promise<HistoryEntry[]> => {
  const { data, error } = await supabase
    .from("browser_history")
    .select("*")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

export const clearHistory = async (userId: string) => {
  await supabase.from("browser_history").delete().eq("user_id", userId);
};

export const deleteHistoryEntry = async (id: string) => {
  await supabase.from("browser_history").delete().eq("id", id);
};

// Bookmarks
export const fetchBookmarks = async (userId: string): Promise<Bookmark[]> => {
  const { data, error } = await supabase
    .from("browser_bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addBookmark = async (userId: string, url: string, title: string) => {
  const { error } = await supabase.from("browser_bookmarks").insert({
    user_id: userId,
    url,
    title,
    favicon_url: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
  });
  if (error) throw error;
};

export const deleteBookmark = async (id: string) => {
  await supabase.from("browser_bookmarks").delete().eq("id", id);
};

// Downloads
export const fetchDownloads = async (userId: string): Promise<DownloadEntry[]> => {
  const { data, error } = await supabase
    .from("browser_downloads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addDownloadEntry = async (userId: string, url: string, fileName: string) => {
  await supabase.from("browser_downloads").insert({
    user_id: userId,
    url,
    file_name: fileName,
  });
};

export const deleteDownloadEntry = async (id: string) => {
  await supabase.from("browser_downloads").delete().eq("id", id);
};

// URL helpers
export const normalizeUrl = (input: string): string => {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) return `https://${trimmed}`;
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(trimmed)}`;
};

export const getDisplayUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const defaultQuickLinks = [
  { title: "Google", url: "https://www.google.com/webhp?igu=1", icon: "🔍" },
  { title: "YouTube", url: "https://m.youtube.com", icon: "▶️" },
  { title: "Facebook", url: "https://m.facebook.com", icon: "📘" },
  { title: "Instagram", url: "https://www.instagram.com", icon: "📸" },
  { title: "Twitter/X", url: "https://mobile.twitter.com", icon: "🐦" },
  { title: "Wikipedia", url: "https://en.m.wikipedia.org", icon: "📚" },
  { title: "Reddit", url: "https://www.reddit.com", icon: "🗨️" },
  { title: "GitHub", url: "https://github.com", icon: "💻" },
];
