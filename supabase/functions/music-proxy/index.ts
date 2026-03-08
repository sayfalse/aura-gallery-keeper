import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createDecipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

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

function decryptUrl(encryptedUrl: string): string {
  try {
    const keyBytes = new Uint8Array([0x33, 0x38, 0x33, 0x34, 0x36, 0x35, 0x39, 0x31]); // "38346591" as bytes
    const decipher = createDecipheriv("des-ecb", keyBytes, null);
    decipher.setAutoPadding(true);
    const encData = Uint8Array.from(atob(encryptedUrl), c => c.charCodeAt(0));
    let decrypted = decipher.update(encData);
    const final = decipher.final();
    const result = new Uint8Array(decrypted.length + final.length);
    result.set(new Uint8Array(decrypted.buffer, decrypted.byteOffset, decrypted.length));
    result.set(new Uint8Array(final.buffer, final.byteOffset, final.length), decrypted.length);
    const url = new TextDecoder().decode(result);
    return url.replace("_96.mp4", "_320.mp4").replace("_96_p.mp4", "_320.mp4");
  } catch (e) {
    console.error("Decrypt error:", e);
    return "";
  }
}

function mapSong(s: any): any {
  let image = s.image || "";
  if (typeof image === "string") image = image.replace(/150x150|50x50/, "500x500");

  const artist = s.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(", ")
    || s.primary_artists || s.more_info?.primary_artists || s.singers
    || (s.subtitle ? s.subtitle.split(" - ")[0] : "") || "";

  let url = "";
  const encUrl = s.encrypted_media_url || s.more_info?.encrypted_media_url;
  if (encUrl) url = decryptUrl(encUrl);
  if (!url) {
    const previewUrl = s.media_preview_url || s.more_info?.media_preview_url;
    if (previewUrl) {
      url = previewUrl.replace("preview.saavncdn.com", "aac.saavncdn.com").replace("_96_p.mp4", "_320.mp4");
    }
  }

  return {
    id: s.id || "",
    name: s.title || s.song || "",
    artist,
    album: s.more_info?.album || s.album || "",
    image,
    duration: s.more_info?.duration ? parseInt(s.more_info.duration) : (s.duration ? parseInt(s.duration) : 0),
    url,
    year: s.year || "",
    language: s.language || "",
  };
}

async function searchSongs(query: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    p: "1", q: query, _format: "json", _marker: "0",
    api_version: "4", ctx: "web6dot0", n: limit, __call: "search.getResults",
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  return { data: { results: (data.results || []).map(mapSong) } };
}

async function getSongById(id: string): Promise<any> {
  const params = new URLSearchParams({
    pids: id, _format: "json", __call: "song.getDetails", ctx: "web6dot0", api_version: "4",
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = data.songs || (data[id] ? [data[id]] : Object.values(data).filter((v: any) => v?.id));
  return { data: songs.map(mapSong) };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    pid: id, _format: "json", __call: "reco.getreco", ctx: "web6dot0", api_version: "4", n: limit,
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v?.id);
  return { data: songs.map(mapSong) };
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
