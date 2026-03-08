import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use the public saavn.dev API which provides direct download URLs
// Multiple API endpoints for reliability
const SAAVN_APIS = [
  "https://saavn.dev/api",
  "https://jiosaavn-api-privatecvc2.vercel.app/api",
];

let currentApiIndex = 0;

function getSaavnApi(): string {
  return SAAVN_APIS[currentApiIndex % SAAVN_APIS.length];
}

function mapSong(s: any): any {
  // Get best quality image
  let image = "";
  if (Array.isArray(s.image)) {
    const best = s.image.find((i: any) => i.quality === "500x500") || s.image[s.image.length - 1];
    image = best?.url || "";
  } else if (typeof s.image === "string") {
    image = s.image;
  }

  // Get best quality download URL
  let url = "";
  if (Array.isArray(s.downloadUrl)) {
    const best = s.downloadUrl.find((d: any) => d.quality === "320kbps") 
      || s.downloadUrl.find((d: any) => d.quality === "160kbps")
      || s.downloadUrl[s.downloadUrl.length - 1];
    url = best?.url || "";
  } else if (typeof s.downloadUrl === "string") {
    url = s.downloadUrl;
  }

  // Get artist names
  let artist = "";
  if (s.artists?.primary?.length) {
    artist = s.artists.primary.map((a: any) => a.name).join(", ");
  } else if (s.artists?.all?.length) {
    artist = s.artists.all.slice(0, 3).map((a: any) => a.name).join(", ");
  } else if (typeof s.artist === "string") {
    artist = s.artist;
  }

  return {
    id: s.id || "",
    name: s.name || s.title || "",
    artist,
    album: s.album?.name || s.album || "",
    image,
    duration: s.duration ? parseInt(s.duration) : 0,
    url,
    year: s.year || s.releaseDate?.split("-")[0] || "",
    language: s.language || "",
  };
}

async function fetchSaavn(endpoint: string): Promise<any> {
  const apis = [...SAAVN_APIS];
  for (let i = 0; i < apis.length; i++) {
    const apiBase = apis[(currentApiIndex + i) % apis.length];
    try {
      const res = await fetch(`${apiBase}/${endpoint}`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) {
        console.error(`Saavn API error: ${res.status} from ${apiBase}`);
        continue;
      }
      currentApiIndex = (currentApiIndex + i) % apis.length;
      return res.json();
    } catch (e) {
      console.error(`Saavn API fetch failed from ${apiBase}:`, e);
      continue;
    }
  }
  throw new Error("All API endpoints failed");
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const data = await fetchSaavn(`search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
  const results = data.data?.results || [];
  return { data: { results: results.map(mapSong) } };
}

async function getSongById(id: string): Promise<any> {
  const data = await fetchSaavn(`songs/${id}`);
  const songs = data.data || [];
  return { data: (Array.isArray(songs) ? songs : [songs]).map(mapSong) };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  try {
    const data = await fetchSaavn(`songs/${id}/suggestions?limit=${limit}`);
    const songs = data.data || [];
    return { data: (Array.isArray(songs) ? songs : [songs]).map(mapSong) };
  } catch {
    // Fallback: search for related songs
    const songData = await fetchSaavn(`songs/${id}`);
    const song = songData.data?.[0] || songData.data;
    if (song?.artists?.primary?.[0]?.name) {
      return searchSongs(song.artists.primary[0].name, limit);
    }
    return { data: [] };
  }
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
