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

// DES key for JioSaavn
const DES_KEY_STR = "38346591";

// Use a pure-JS DES-ECB implementation that actually works
// Based on the standard DES algorithm
function desDecryptBlock(block: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  // Convert to 64-bit numbers for processing
  let L = (block[0] << 24) | (block[1] << 16) | (block[2] << 8) | block[3];
  let R = (block[4] << 24) | (block[5] << 16) | (block[6] << 8) | block[7];

  // Initial Permutation
  let t: number;
  t = ((L >>> 4) ^ R) & 0x0f0f0f0f; R ^= t; L ^= (t << 4);
  t = ((L >>> 16) ^ R) & 0x0000ffff; R ^= t; L ^= (t << 16);
  t = ((R >>> 2) ^ L) & 0x33333333; L ^= t; R ^= (t << 2);
  t = ((R >>> 8) ^ L) & 0x00ff00ff; L ^= t; R ^= (t << 8);
  t = ((L >>> 1) ^ R) & 0x55555555; R ^= t; L ^= (t << 1);

  // Rotate
  L = ((L << 1) | (L >>> 31)) & 0xffffffff;
  R = ((R << 1) | (R >>> 31)) & 0xffffffff;

  // Generate subkeys
  const keys = generateKeys(keyBytes);

  // 16 rounds (reversed for decryption)
  for (let i = 15; i >= 0; i--) {
    const Er = expandR(R);
    const xored0 = Er[0] ^ keys[i][0];
    const xored1 = Er[1] ^ keys[i][1];
    const sOut = sBoxLookup(xored0, xored1);
    const pOut = permP(sOut);
    const newR = L ^ pOut;
    L = R;
    R = newR;
  }

  // Undo rotate
  L = ((L >>> 1) | (L << 31)) & 0xffffffff;
  R = ((R >>> 1) | (R << 31)) & 0xffffffff;

  // Final Permutation (inverse of IP)
  t = ((L >>> 1) ^ R) & 0x55555555; R ^= t; L ^= (t << 1);
  t = ((R >>> 8) ^ L) & 0x00ff00ff; L ^= t; R ^= (t << 8);
  t = ((R >>> 2) ^ L) & 0x33333333; L ^= t; R ^= (t << 2);
  t = ((L >>> 16) ^ R) & 0x0000ffff; R ^= t; L ^= (t << 16);
  t = ((L >>> 4) ^ R) & 0x0f0f0f0f; R ^= t; L ^= (t << 4);

  const result = new Uint8Array(8);
  result[0] = (L >>> 24) & 0xff;
  result[1] = (L >>> 16) & 0xff;
  result[2] = (L >>> 8) & 0xff;
  result[3] = L & 0xff;
  result[4] = (R >>> 24) & 0xff;
  result[5] = (R >>> 16) & 0xff;
  result[6] = (R >>> 8) & 0xff;
  result[7] = R & 0xff;
  return result;
}

// S-boxes
const SP1 = new Uint32Array([0x01010400,0x00000000,0x00010000,0x01010404,0x01010004,0x00010404,0x00000004,0x00010000,0x00000400,0x01010400,0x01010404,0x00000400,0x01000404,0x01010004,0x01000000,0x00000004,0x00000404,0x01000400,0x01000400,0x00010400,0x00010400,0x01010000,0x01010000,0x01000404,0x00010004,0x01000004,0x01000004,0x00010004,0x00000000,0x00000404,0x00010404,0x01000000,0x00010000,0x01010404,0x00000004,0x01010000,0x01010400,0x01000000,0x01000000,0x00000400,0x01010004,0x00010000,0x00010400,0x01000004,0x00000400,0x00000004,0x01000404,0x00010404,0x01010404,0x00010004,0x01010000,0x01000404,0x01000004,0x00000404,0x00010404,0x01010400,0x00000404,0x01000400,0x01000400,0x00000000,0x00010004,0x00010400,0x00000000,0x01010004]);
const SP2 = new Uint32Array([0x80108020,0x80008000,0x00008000,0x00108020,0x00100000,0x00000020,0x80100020,0x80008020,0x80000020,0x80108020,0x80108000,0x80000000,0x80008000,0x00100000,0x00000020,0x80100020,0x00108000,0x00100020,0x80008020,0x00000000,0x80000000,0x00008000,0x00108020,0x80100000,0x00100020,0x80000020,0x00000000,0x00108000,0x00008020,0x80108000,0x80100000,0x00008020,0x00000000,0x00108020,0x80100020,0x00100000,0x80008020,0x80100000,0x80108000,0x00008000,0x80100000,0x80008000,0x00000020,0x80108020,0x00108020,0x00000020,0x00008000,0x80000000,0x00008020,0x80108000,0x00100000,0x80000020,0x00100020,0x80008020,0x80000020,0x00100020,0x00108000,0x00000000,0x80008000,0x00008020,0x80000000,0x80100020,0x80108020,0x00108000]);
const SP3 = new Uint32Array([0x00000208,0x08020200,0x00000000,0x08020008,0x08000200,0x00000000,0x00020208,0x08000200,0x00020008,0x08000008,0x08000008,0x00020000,0x08020208,0x00020008,0x08020000,0x00000208,0x08000000,0x00000008,0x08020200,0x00000200,0x00020200,0x08020000,0x08020008,0x00020208,0x08000208,0x00020200,0x00020000,0x08000208,0x00000008,0x08020208,0x00000200,0x08000000,0x08020200,0x08000000,0x00020008,0x00000208,0x00020000,0x08020200,0x08000200,0x00000000,0x00000200,0x00020008,0x08020208,0x08000200,0x08000008,0x00000200,0x00000000,0x08020008,0x08000208,0x00020000,0x08000000,0x08020208,0x00000008,0x00020208,0x00020200,0x08000008,0x08020000,0x08000208,0x00000208,0x08020000,0x00020208,0x00000008,0x08020008,0x00020200]);
const SP4 = new Uint32Array([0x00802001,0x00002081,0x00002081,0x00000080,0x00802080,0x00800081,0x00800001,0x00002001,0x00000000,0x00802000,0x00802000,0x00802081,0x00000081,0x00000000,0x00800080,0x00800001,0x00000001,0x00002000,0x00800000,0x00802001,0x00000080,0x00800000,0x00002001,0x00002080,0x00800081,0x00000001,0x00002080,0x00800080,0x00002000,0x00802080,0x00802081,0x00000081,0x00800080,0x00800001,0x00802000,0x00802081,0x00000081,0x00000000,0x00000000,0x00802000,0x00002080,0x00800080,0x00800081,0x00000001,0x00802001,0x00002081,0x00002081,0x00000080,0x00802081,0x00000081,0x00000001,0x00002000,0x00800001,0x00002001,0x00802080,0x00800081,0x00002001,0x00002080,0x00800000,0x00802001,0x00000080,0x00800000,0x00002000,0x00802080]);
const SP5 = new Uint32Array([0x00000100,0x02080100,0x02080000,0x42000100,0x00080000,0x00000100,0x40000000,0x02080000,0x40080100,0x00080000,0x02000100,0x40080100,0x42000100,0x42080000,0x00080100,0x40000000,0x02000000,0x40080000,0x40080000,0x00000000,0x40000100,0x42080100,0x42080100,0x02000100,0x42080000,0x40000100,0x00000000,0x42000000,0x02080100,0x02000000,0x42000000,0x00080100,0x00080000,0x42000100,0x00000100,0x02000000,0x40000000,0x02080000,0x42000100,0x40080100,0x02000100,0x40000000,0x42080000,0x02080100,0x40080100,0x00000100,0x02000000,0x42080000,0x42080100,0x00080100,0x42000000,0x42080100,0x02080000,0x00000000,0x40080000,0x42000000,0x00080100,0x02000100,0x40000100,0x00080000,0x00000000,0x40080000,0x02080100,0x40000100]);
const SP6 = new Uint32Array([0x20000010,0x20400000,0x00004000,0x20404010,0x20400000,0x00000010,0x20404010,0x00400000,0x20004000,0x00404010,0x00400000,0x20000010,0x00400010,0x20004000,0x20000000,0x00004010,0x00000000,0x00400010,0x20004010,0x00004000,0x00404000,0x20004010,0x00000010,0x20400010,0x20400010,0x00000000,0x00404010,0x20404000,0x00004010,0x00404000,0x20404000,0x20000000,0x20004000,0x00000010,0x20400010,0x00404000,0x20404010,0x00400000,0x00004010,0x20000010,0x00400000,0x20004000,0x20000000,0x00004010,0x20000010,0x20404010,0x00404000,0x20400000,0x00404010,0x20404000,0x00000000,0x20400010,0x00000010,0x00004000,0x20400000,0x00404010,0x00004000,0x00400010,0x20004010,0x00000000,0x20404000,0x20000000,0x00400010,0x20004010]);
const SP7 = new Uint32Array([0x00200000,0x04200002,0x04000802,0x00000000,0x00000800,0x04000802,0x00200802,0x04200800,0x04200802,0x00200000,0x00000000,0x04000002,0x00000002,0x04000000,0x04200002,0x00000802,0x04000800,0x00200802,0x00200002,0x04000800,0x04000002,0x04200000,0x04200800,0x00200002,0x04200000,0x00000800,0x00000802,0x04200802,0x00200800,0x00000002,0x04000000,0x00200800,0x04000000,0x00200800,0x00200000,0x04000802,0x04000802,0x04200002,0x04200002,0x00000002,0x00200002,0x04000000,0x04000800,0x00200000,0x04200800,0x00000802,0x00200802,0x04200800,0x00000802,0x04000002,0x04200802,0x04200000,0x00200800,0x00000000,0x00000002,0x04200802,0x00000000,0x00200802,0x04200000,0x00000800,0x04000002,0x04000800,0x00000800,0x00200002]);
const SP8 = new Uint32Array([0x10001040,0x00001000,0x00040000,0x10041040,0x10000000,0x10001040,0x00000040,0x10000000,0x00040040,0x10040000,0x10041040,0x00041000,0x10041000,0x00041040,0x00001000,0x00000040,0x10040000,0x10000040,0x10001000,0x00001040,0x00041000,0x00040040,0x10040040,0x10041000,0x00001040,0x00000000,0x00000000,0x10040040,0x10000040,0x10001000,0x00041040,0x00040000,0x00041040,0x00040000,0x10041000,0x00001000,0x00000040,0x10040040,0x00001000,0x00041040,0x10001000,0x00000040,0x10000040,0x10040000,0x10040040,0x10000000,0x00040000,0x10001040,0x00000000,0x10041040,0x00040040,0x10000040,0x10040000,0x10001000,0x10001040,0x00000000,0x10041040,0x00041000,0x00041000,0x00001040,0x00001040,0x00040040,0x10000000,0x10041000]);

const SHIFTS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];

function generateKeys(key: Uint8Array): number[][] {
  let c = ((key[0] & 0xfe) << 20) | (key[1] << 12) | (key[2] << 4) | (key[3] >>> 4);
  let d = ((key[3] & 0x0f) << 24) | (key[4] << 16) | (key[5] << 8) | key[6];

  // PC1
  let t: number;
  t = ((c >>> 4) ^ d) & 0x0f0f0f0f; d ^= t; c ^= (t << 4);
  t = ((d >>> 16) ^ c) & 0x0000ffff; c ^= t; d ^= (t << 16);
  t = ((c >>> 2) ^ d) & 0x33333333; d ^= t; c ^= (t << 2);
  t = ((d >>> 16) ^ c) & 0x0000ffff; c ^= t; d ^= (t << 16);
  t = ((c >>> 1) ^ d) & 0x55555555; d ^= t; c ^= (t << 1);
  t = ((d >>> 8) ^ c) & 0x00ff00ff; c ^= t; d ^= (t << 8);
  t = ((c >>> 1) ^ d) & 0x55555555; d ^= t; c ^= (t << 1);

  d = ((d & 0xff) << 16) | (d & 0xff00) | ((d >>> 16) & 0xff) | ((c >>> 4) & 0x0f000000);
  c &= 0x0fffffff;

  const keys: number[][] = [];
  for (let i = 0; i < 16; i++) {
    if (SHIFTS[i] === 1) {
      c = ((c << 1) | (c >>> 27)) & 0x0fffffff;
      d = ((d << 1) | (d >>> 27)) & 0x0fffffff;
    } else {
      c = ((c << 2) | (c >>> 26)) & 0x0fffffff;
      d = ((d << 2) | (d >>> 26)) & 0x0fffffff;
    }

    const s1 = ((c << 4) & 0x24000000) | ((c << 28) & 0x10000000) |
      ((c << 14) & 0x08000000) | ((c << 18) & 0x02080000) |
      ((c << 6) & 0x01000000) | ((c << 9) & 0x00200000) |
      ((c >>> 1) & 0x00100000) | ((c << 10) & 0x00040000) |
      ((c << 2) & 0x00020000) | ((c >>> 10) & 0x00010000) |
      ((d >>> 13) & 0x00002000) | ((d >>> 4) & 0x00001000) |
      ((d << 6) & 0x00000800) | ((d >>> 1) & 0x00000400) |
      ((d >>> 14) & 0x00000200) | (d & 0x00000100) |
      ((d >>> 5) & 0x00000020) | ((d >>> 10) & 0x00000010) |
      ((d >>> 3) & 0x00000008) | ((d >>> 18) & 0x00000004) |
      ((d >>> 26) & 0x00000002) | ((d >>> 24) & 0x00000001);

    const s2 = ((c << 15) & 0x20000000) | ((c << 17) & 0x10000000) |
      ((c << 10) & 0x08000000) | ((c << 22) & 0x04000000) |
      ((c >>> 2) & 0x02000000) | ((c << 1) & 0x01000000) |
      ((c << 16) & 0x00200000) | ((c << 11) & 0x00100000) |
      ((c << 3) & 0x00080000) | ((c >>> 6) & 0x00040000) |
      ((c << 15) & 0x00020000) | ((c >>> 4) & 0x00010000) |
      ((d >>> 2) & 0x00002000) | ((d << 8) & 0x00001000) |
      ((d >>> 14) & 0x00000808) | ((d >>> 9) & 0x00000400) |
      (d & 0x00000200) | ((d << 7) & 0x00000100) |
      ((d >>> 7) & 0x00000020) | ((d >>> 3) & 0x00000011) |
      ((d << 2) & 0x00000004) | ((d >>> 21) & 0x00000002);

    keys.push([s1, s2]);
  }
  return keys;
}

function expandR(r: number): [number, number] {
  return [
    ((r << 1) | (r >>> 31)) & 0xffffffff,
    ((r >>> 3) | (r << 29)) & 0xffffffff,
  ];
}

function sBoxLookup(s1: number, s2: number): number {
  return SP1[(s1 >>> 24) & 0x3f] | SP2[(s1 >>> 16) & 0x3f] |
    SP3[(s1 >>> 8) & 0x3f] | SP4[s1 & 0x3f] |
    SP5[(s2 >>> 24) & 0x3f] | SP6[(s2 >>> 16) & 0x3f] |
    SP7[(s2 >>> 8) & 0x3f] | SP8[s2 & 0x3f];
}

function permP(s: number): number {
  return s; // The S-box tables already include the P permutation
}

function desEcbDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 8) {
    const block = data.slice(i, i + 8);
    const decrypted = desDecryptBlock(block, key);
    result.set(decrypted, i);
  }
  // Remove PKCS5 padding
  if (result.length > 0) {
    const padLen = result[result.length - 1];
    if (padLen > 0 && padLen <= 8) {
      // Verify padding
      let validPad = true;
      for (let i = result.length - padLen; i < result.length; i++) {
        if (result[i] !== padLen) { validPad = false; break; }
      }
      if (validPad) return result.slice(0, result.length - padLen);
    }
  }
  return result;
}

function decryptUrl(encryptedUrl: string): string {
  try {
    const binaryStr = atob(encryptedUrl);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const key = new TextEncoder().encode(DES_KEY_STR);
    const decrypted = desEcbDecrypt(bytes, key);
    const url = new TextDecoder().decode(decrypted);
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
  const results = (data.results || []).map(mapSong);
  return { data: { results } };
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
