import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Referer": "https://www.jiosaavn.com/",
  "Cookie": "L=english",
};

function getStreamUrl(s: any): string {
  // Try media_preview_url and upgrade to high quality
  const previewUrl = s.media_preview_url || s.more_info?.media_preview_url || s.preview_url || s.more_info?.preview_url;
  if (previewUrl) {
    return previewUrl
      .replace("preview.saavncdn.com", "aac.saavncdn.com")
      .replace("_96_p.mp4", "_320.mp4")
      .replace("_96.mp4", "_320.mp4")
      .replace("_96_p.mp3", "_320.mp3")
      .replace("/96/", "/320/");
  }
  
  // Try vlink / perma_url based construction
  if (s.perma_url) {
    const match = s.perma_url.match(/\/song\/[^/]+\/([^/]+)$/);
    if (match) {
      // Can't construct URL from permalink alone
    }
  }
  
  return "";
}

function mapSong(s: any): any {
  let image = s.image || "";
  if (typeof image === "string") {
    image = image
      .replace(/150x150|50x50|500x500/, "500x500")
      .replace("c.saavncdn.com/", "c.saavncdn.com/");
  }

  const artist = s.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(", ")
    || s.primary_artists || s.more_info?.primary_artists || s.singers
    || (s.subtitle ? s.subtitle.split(" - ")[0] : "") || "";

  return {
    id: s.id || "",
    name: s.title || s.song || s.name || "",
    artist,
    album: s.more_info?.album || s.album || "",
    image,
    duration: s.more_info?.duration ? parseInt(s.more_info.duration) : (s.duration ? parseInt(s.duration) : 0),
    url: getStreamUrl(s),
    year: s.year || "",
    language: s.language || s.more_info?.language || "",
  };
}

async function fetchJioSaavn(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const url = `${JIOSAAVN_BASE}?${qs}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`JioSaavn API error: ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // Sometimes JioSaavn returns JSONP or HTML, try to extract JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Invalid JSON response");
  }
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const data = await fetchJioSaavn({
    p: "1", q: query, _format: "json", _marker: "0",
    api_version: "4", ctx: "web6dot0", n: limit, __call: "search.getResults",
  });
  
  const results = (data.results || []).map(mapSong);
  
  // For songs without URLs, try to resolve them individually
  const resolved = await Promise.all(results.slice(0, 15).map(async (song: any) => {
    if (song.url) return song;
    if (!song.id) return song;
    try {
      const url = await resolveSongUrl(song.id);
      return { ...song, url };
    } catch {
      return song;
    }
  }));
  
  return { data: { results: resolved } };
}

async function resolveSongUrl(songId: string): Promise<string> {
  try {
    const data = await fetchJioSaavn({
      pids: songId, _format: "json", __call: "song.getDetails", ctx: "web6dot0", api_version: "4",
    });
    const song = data.songs?.[0] || data[songId];
    if (!song) return "";
    return getStreamUrl(song);
  } catch { return ""; }
}

async function getSongById(id: string): Promise<any> {
  const data = await fetchJioSaavn({
    pids: id, _format: "json", __call: "song.getDetails", ctx: "web6dot0", api_version: "4",
  });
  const songs = data.songs || (data[id] ? [data[id]] : Object.values(data).filter((v: any) => v?.id));
  return { data: songs.map(mapSong) };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const data = await fetchJioSaavn({
    pid: id, _format: "json", __call: "reco.getreco", ctx: "web6dot0", api_version: "4", n: limit,
  });
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v?.id);
  const mapped = songs.map(mapSong);
  
  // Resolve URLs for suggestions
  const resolved = await Promise.all(mapped.slice(0, 10).map(async (song: any) => {
    if (song.url) return song;
    if (!song.id) return song;
    try {
      const url = await resolveSongUrl(song.id);
      return { ...song, url };
    } catch {
      return song;
    }
  }));
  
  return { data: resolved };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    const query = url.searchParams.get("query") || "";
    const limit = url.searchParams.get("limit") || "20";
    const id = url.searchParams.get("id") || "";

    console.log(`Music proxy request: path=${path}, query=${query}, id=${id}`);

    let result: any;
    switch (path) {
      case "search": result = await searchSongs(query, limit); break;
      case "song": result = await getSongById(id); break;
      case "suggestions": result = await getSuggestions(id, limit); break;
      default:
        return new Response(JSON.stringify({ error: "Invalid path" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const songCount = result.data?.results?.length || result.data?.length || 0;
    console.log(`Returning ${songCount} songs`);

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Music proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
