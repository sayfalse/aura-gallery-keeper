import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// ===== DES-ECB Decryption (minimal, for JioSaavn URLs) =====
// JioSaavn Key: "38346591"

const IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
const FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];
const E = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
const P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
const PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
const PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
const SHIFTS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];
const SBOX = [
  [[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7],[0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8],[4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0],[15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13]],
  [[15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10],[3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5],[0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15],[13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9]],
  [[10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8],[13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1],[13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7],[1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12]],
  [[7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15],[13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9],[10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4],[3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14]],
  [[2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9],[14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6],[4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14],[11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3]],
  [[12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11],[10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8],[9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6],[4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13]],
  [[4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1],[13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6],[1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2],[6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12]],
  [[13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7],[1,15,13,8,10,3,7,4,12,5,6,2,0,14,9,11],[7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8],[2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]],
];

function bytesToBits(bytes: Uint8Array): number[] {
  const bits: number[] = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  return bits;
}
function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    bytes[i / 8] = b;
  }
  return bytes;
}
function permute(bits: number[], table: number[]): number[] {
  return table.map(p => bits[p - 1]);
}
function xor(a: number[], b: number[]): number[] {
  return a.map((v, i) => v ^ b[i]);
}
function leftShift(bits: number[], n: number): number[] {
  return [...bits.slice(n), ...bits.slice(0, n)];
}

function generateKeys(keyBytes: Uint8Array): number[][] {
  const keyBits = bytesToBits(keyBytes);
  const cd = permute(keyBits, PC1);
  let c = cd.slice(0, 28), d = cd.slice(28);
  const keys: number[][] = [];
  for (let i = 0; i < 16; i++) {
    c = leftShift(c, SHIFTS[i]);
    d = leftShift(d, SHIFTS[i]);
    keys.push(permute([...c, ...d], PC2));
  }
  return keys;
}

function desBlock(block: number[], keys: number[][]): number[] {
  let bits = permute(block, IP);
  let l = bits.slice(0, 32), r = bits.slice(32);
  for (let i = 0; i < 16; i++) {
    const expanded = permute(r, E);
    const x = xor(expanded, keys[i]);
    const sOut: number[] = [];
    for (let j = 0; j < 8; j++) {
      const chunk = x.slice(j * 6, j * 6 + 6);
      const row = (chunk[0] << 1) | chunk[5];
      const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
      const val = SBOX[j][row][col];
      for (let k = 3; k >= 0; k--) sOut.push((val >> k) & 1);
    }
    const f = permute(sOut, P);
    const newR = xor(l, f);
    l = r;
    r = newR;
  }
  return permute([...r, ...l], FP);
}

function desEcbDecrypt(data: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const keys = generateKeys(keyBytes).reverse(); // Reverse for decryption
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 8) {
    const block = bytesToBits(data.slice(i, i + 8));
    const dec = desBlock(block, keys);
    const decBytes = bitsToBytes(dec);
    result.set(decBytes, i);
  }
  // Remove PKCS5 padding
  const padLen = result[result.length - 1];
  if (padLen > 0 && padLen <= 8) {
    return result.slice(0, result.length - padLen);
  }
  return result;
}

function decryptMediaUrl(encUrl: string): string {
  try {
    // Base64 decode
    const raw = Uint8Array.from(atob(encUrl), c => c.charCodeAt(0));
    const key = new TextEncoder().encode("38346591");
    const dec = desEcbDecrypt(raw, key);
    const url = new TextDecoder().decode(dec);
    // Replace quality in URL
    return url.replace("_96.mp4", "_320.mp4").replace("_96_p.mp4", "_320.mp4");
  } catch (e) {
    console.error("Decrypt error:", e);
    return "";
  }
}

// ===== End DES =====

function mapSong(s: any): any {
  let image = s.image || "";
  if (typeof image === "string") {
    image = image.replace(/150x150|50x50/, "500x500");
  }

  const artist = s.more_info?.artistMap?.primary_artists?.map((a: any) => a.name).join(", ")
    || s.primary_artists || s.more_info?.primary_artists || s.singers
    || (s.subtitle ? s.subtitle.split(" - ")[0] : "") || "";

  let url = "";
  if (s.more_info?.encrypted_media_url) {
    url = decryptMediaUrl(s.more_info.encrypted_media_url);
  } else if (s.media_preview_url) {
    url = s.media_preview_url.replace("preview.saavncdn.com", "aac.saavncdn.com").replace("_96_p.mp4", "_320.mp4");
  }

  return {
    id: s.id || "",
    name: s.title || s.song || "",
    artist,
    album: s.more_info?.album || s.album || "",
    image,
    duration: s.more_info?.duration ? parseInt(s.more_info.duration) : (s.duration ? parseInt(s.duration) : 0),
    url,
    year: s.year || s.more_info?.year || "",
    language: s.language || s.more_info?.language || "",
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
    pids: id, _format: "json", __call: "song.getDetails",
    ctx: "web6dot0", api_version: "4",
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = data.songs || (data[id] ? [data[id]] : Object.values(data).filter((v: any) => v && typeof v === 'object' && v.id));
  return { data: songs.map(mapSong) };
}

async function getSuggestions(id: string, limit: string): Promise<any> {
  const params = new URLSearchParams({
    pid: id, _format: "json", __call: "reco.getreco",
    ctx: "web6dot0", api_version: "4", n: limit,
  });
  const res = await fetch(`${JIOSAAVN_BASE}?${params}`, { headers: HEADERS });
  const data = await res.json();
  const songs = Array.isArray(data) ? data : Object.values(data).filter((v: any) => v && typeof v === 'object' && v.id);
  return { data: songs.map(mapSong) };
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
