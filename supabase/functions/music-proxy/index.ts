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
};

// Get direct streaming URL via the webapi endpoint which returns media_preview_url
async function getStreamUrl(songId: string): Promise<string> {
  try {
    const params = new URLSearchParams({
      __call: "webapi.get",
      token: songId,
      type: "song",
      includeMetaTags: "0",
      ctx: "web6dot0",
      api_version: "4",
      _format: "json",
      _marker: "0",
    });
    const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
    const data = await res.json();
    const song = data?.songs?.[0];
    if (song?.media_preview_url) {
      return song.media_preview_url
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace("_96_p.mp4", "_320.mp4");
    }
    // Fallback: try media_url directly
    if (song?.media_url) return song.media_url;
    return "";
  } catch {
    return "";
  }
}

function mapSong(s: any): any {
  let image = s.image || "";
  if (typeof image === "string") image = image.replace(/150x150|50x50/, "500x500");

  const artist = s.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(", ")
    || s.primary_artists || s.more_info?.primary_artists || s.singers
    || (s.subtitle ? s.subtitle.split(" - ")[0] : "") || "";

  return {
    id: s.id || "", name: s.title || s.song || "", artist,
    album: s.more_info?.album || s.album || "", image,
    duration: s.more_info?.duration ? parseInt(s.more_info.duration) : (s.duration ? parseInt(s.duration) : 0),
    url: "", // Will be resolved
    year: s.year || "", language: s.language || "",
  };
}

async function resolveUrls(songs: any[]): Promise<any[]> {
  // Resolve stream URLs in parallel (max 5 at a time)
  const batch = songs.slice(0, 20);
  const resolved = await Promise.all(
    batch.map(async (song: any) => {
      if (!song.id) return song;
      const url = await getStreamUrl(song.id);
      return { ...song, url };
    })
  );
  return resolved;
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    p: "1", q: query, _format: "json", _marker: "0",
    api_version: "4", ctx: "web6dot0", n: limit, __call: "search.getResults",
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const mapped = (data.results || []).map(mapSong);
  const resolved = await resolveUrls(mapped);
  return { data: { results: resolved } };
}

async function getSongById(id: string): Promise<any> {
  const params = new URLSearchParams({
    pids: id, _format: "json", __call: "song.getDetails", ctx: "web6dot0", api_version: "4",
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = data.songs || (data[id] ? [data[id]] : Object.values(data).filter((v: any) => v?.id));
  const mapped = songs.map(mapSong);
  const resolved = await resolveUrls(mapped);
  return { data: resolved };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    pid: id, _format: "json", __call: "reco.getreco", ctx: "web6dot0", api_version: "4", n: limit,
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v?.id);
  const mapped = songs.map(mapSong);
  const resolved = await resolveUrls(mapped);
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
