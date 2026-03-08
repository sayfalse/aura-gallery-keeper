import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Use the public saavn.dev API which handles decryption server-side
const SAAVN_API = "https://saavn.dev/api";

function mapSong(s: any): any {
  const image = s.image?.[2]?.url || s.image?.[1]?.url || s.image?.[0]?.url || "";
  const artist = s.artists?.primary?.map((a: any) => a.name).join(", ")
    || s.artists?.all?.map((a: any) => a.name).join(", ")
    || s.primaryArtists || "";
  // Get highest quality download URL
  const url = s.downloadUrl?.[4]?.url || s.downloadUrl?.[3]?.url
    || s.downloadUrl?.[2]?.url || s.downloadUrl?.[1]?.url
    || s.downloadUrl?.[0]?.url || "";

  return {
    id: s.id || "",
    name: s.name || s.title || "",
    artist,
    album: s.album?.name || s.album || "",
    image,
    duration: s.duration ? parseInt(s.duration) : 0,
    url,
    year: s.year || "",
    language: s.language || "",
  };
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const res = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
  const data = await res.json();
  if (!data.success) throw new Error("Search failed");
  const results = (data.data?.results || []).map(mapSong);
  return { data: { results } };
}

async function getSongById(id: string): Promise<any> {
  const res = await fetch(`${SAAVN_API}/songs/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error("Song fetch failed");
  const songs = (data.data || []).map(mapSong);
  return { data: songs };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const res = await fetch(`${SAAVN_API}/songs/${id}/suggestions?limit=${limit}`);
  const data = await res.json();
  if (!data.success) {
    // Fallback: search for similar songs
    return { data: [] };
  }
  const songs = (data.data || []).map(mapSong);
  return { data: songs };
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
