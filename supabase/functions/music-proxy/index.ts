import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode, encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const JIOSAAVN_BASE = "https://www.jiosaavn.com/api.php";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.jiosaavn.com/",
};

// DES-ECB decryption for JioSaavn encrypted URLs
// Key: "38346591" 
const DES_KEY = new TextEncoder().encode("38346591");

// Simple DES implementation for ECB mode
// JioSaavn uses DES-ECB with PKCS5 padding and base64
async function decryptUrl(encryptedUrl: string): Promise<string> {
  try {
    // Import key for DES-ECB
    const key = await crypto.subtle.importKey(
      "raw",
      DES_KEY,
      { name: "DES-ECB" } as any,
      false,
      ["decrypt"]
    );
    
    const data = base64Decode(encryptedUrl);
    const decrypted = await crypto.subtle.decrypt(
      { name: "DES-ECB" } as any,
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted).replace(/[\x00-\x08]/g, "");
  } catch (e) {
    console.log("Crypto subtle DES not supported, using fallback");
    // Fallback: use the song detail API which sometimes gives direct URLs
    return encryptedUrl;
  }
}

// Get streaming URL by using the station/song API which returns direct CDN URLs
async function getStreamUrl(songId: string): Promise<string> {
  try {
    const params = new URLSearchParams({
      __call: "song.generateAuthToken",
      url: `https://www.jiosaavn.com/song/x/${songId}`,
      bitrate: "320",
      api_version: "4",
      _format: "json",
      ctx: "web6dot0",
    });
    
    const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
    const data = await res.json();
    
    if (data.auth_url) return data.auth_url;
    
    // Try alternate method
    const params2 = new URLSearchParams({
      __call: "webapi.get",
      token: songId,
      type: "song",
      includeMetaTags: "0",
      ctx: "web6dot0",
      api_version: "4",
      _format: "json",
      _marker: "0",
    });
    
    const res2 = await fetch(`${JIOSAAVN_BASE}?${params2}`, { headers: HEADERS });
    const data2 = await res2.json();
    
    if (data2.songs?.[0]?.media_preview_url) {
      return data2.songs[0].media_preview_url
        .replace("preview.saavncdn.com", "aac.saavncdn.com")
        .replace("_96_p.mp4", "_320.mp4");
    }
    
    return "";
  } catch (e) {
    console.error("getStreamUrl error:", e);
    return "";
  }
}

function mapSong(s: any): any {
  let image = s.image || "";
  if (typeof image === "string") {
    image = image.replace(/150x150|50x50/, "500x500");
  }

  const artist = s.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(", ")
    || s.primary_artists
    || s.more_info?.primary_artists
    || s.singers
    || (s.subtitle ? s.subtitle.split(" - ")[0] : "")
    || "";

  // encrypted_media_url will be resolved later
  const encUrl = s.more_info?.encrypted_media_url || "";

  return {
    id: s.id || "",
    name: s.title || s.song || "",
    artist,
    album: s.more_info?.album || s.album || "",
    image,
    duration: s.more_info?.duration ? parseInt(s.more_info.duration) : (s.duration ? parseInt(s.duration) : 0),
    url: encUrl, // Will be replaced with stream URL
    year: s.year || s.more_info?.year || "",
    language: s.language || s.more_info?.language || "",
  };
}

async function resolveStreamUrls(songs: any[]): Promise<any[]> {
  // Batch resolve stream URLs for songs
  const resolved = await Promise.all(
    songs.map(async (song: any) => {
      if (song.url && song.url.startsWith("http")) return song;
      if (song.id) {
        const streamUrl = await getStreamUrl(song.id);
        return { ...song, url: streamUrl };
      }
      return song;
    })
  );
  return resolved;
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

  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const results = (data.results || []).map(mapSong);
  const resolved = await resolveStreamUrls(results);

  return { data: { results: resolved } };
}

async function getSongById(id: string): Promise<any> {
  const params = new URLSearchParams({
    pids: id,
    _format: "json",
    __call: "song.getDetails",
    ctx: "web6dot0",
    api_version: "4",
  });

  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = data.songs || (data[id] ? [data[id]] : Object.values(data).filter((v: any) => v && typeof v === 'object' && v.id));
  const mapped = songs.map(mapSong);
  const resolved = await resolveStreamUrls(mapped);

  return { data: resolved };
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

  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v && typeof v === 'object' && v.id);
  const mapped = songs.map(mapSong);
  const resolved = await resolveStreamUrls(mapped);

  return { data: resolved };
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
