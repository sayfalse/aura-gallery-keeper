import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use JioSaavn's native API directly
const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";

function decryptUrl(encUrl: string): string {
  // The download URLs from JioSaavn are already direct CDN links in newer responses
  return encUrl;
}

function mapSong(s: any): any {
  const image = s.image?.replace(/150x150|50x50/, "500x500") || s.image || "";
  
  // Handle download URLs - try multiple quality levels
  let url = "";
  if (s.media_preview_url) {
    // Convert preview URL to full quality
    url = s.media_preview_url.replace("preview.saavncdn.com", "aac.saavncdn.com")
      .replace("_96_p.mp4", "_320.mp4");
  } else if (s.encrypted_media_url) {
    url = s.encrypted_media_url;
  } else if (s.perma_url) {
    url = "";
  }
  
  const artistNames = s.primary_artists || s.singers || s.music || "";

  return {
    id: s.id || "",
    name: s.song || s.title || "",
    artist: artistNames,
    album: s.album || s.more_info?.album || "",
    image,
    duration: s.duration ? parseInt(s.duration) : 0,
    url,
    year: s.year || "",
    language: s.language || "",
  };
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    p: "1",
    q: query,
    _format: "json",
    _marker: "0",
    api_version: "4",
    ctx: "web6dot0",
    n: limit,
    __call: "search.getResults",
  });
  
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
      "Cookie": "L=english",
    },
  });
  
  const data = await res.json();
  const results = data.results || [];
  
  return {
    data: {
      results: results.map(mapSong),
    }
  };
}

async function getSongById(id: string): Promise<any> {
  const params = new URLSearchParams({
    pids: id,
    _format: "json",
    __call: "song.getDetails",
    ctx: "web6dot0",
    api_version: "4",
  });
  
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  
  const data = await res.json();
  const songs = data.songs || Object.values(data) || [];
  
  return {
    data: Array.isArray(songs) ? songs.map(mapSong) : [mapSong(songs)],
  };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    pid: id,
    _format: "json",
    __call: "reco.getreco",
    ctx: "web6dot0",
    api_version: "4",
    n: limit,
  });
  
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "application/json",
    },
  });
  
  const data = await res.json();
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v?.id);
  
  return {
    data: songs.map(mapSong),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    const query = url.searchParams.get("query") || "";
    const limit = url.searchParams.get("limit") || "20";
    const id = url.searchParams.get("id") || "";

    let result: any;

    switch (path) {
      case "search":
        result = await searchSongs(query, limit);
        break;
      case "song":
        result = await getSongById(id);
        break;
      case "suggestions":
        result = await getSuggestions(id, limit);
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Music proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
