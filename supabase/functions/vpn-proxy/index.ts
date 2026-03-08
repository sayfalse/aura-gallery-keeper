import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WARP_API = "https://api.cloudflareclient.com/v0i1909051800";

// Minimal Curve25519 scalar base multiplication (X25519)
// Based on TweetNaCl's implementation
function curve25519ScalarBaseMult(scalar: Uint8Array): Uint8Array {
  const basepoint = new Uint8Array(32);
  basepoint[0] = 9;
  return curve25519ScalarMult(scalar, basepoint);
}

function curve25519ScalarMult(scalar: Uint8Array, point: Uint8Array): Uint8Array {
  const a = new Float64Array(16), b = new Float64Array(16);
  const c = new Float64Array(16), d = new Float64Array(16);
  const e = new Float64Array(16), f = new Float64Array(16);

  const clamped = new Uint8Array(32);
  clamped.set(scalar);
  clamped[0] &= 248;
  clamped[31] &= 127;
  clamped[31] |= 64;

  unpack25519(b, point);
  set25519(a, [1]);
  set25519(d, [1]);

  const x = new Float64Array(b);

  for (let i = 254; i >= 0; --i) {
    const bit = (clamped[i >>> 3] >>> (i & 7)) & 1;
    cswap(a, b, bit);
    cswap(c, d, bit);

    const t0 = new Float64Array(16), t1 = new Float64Array(16);
    const t2 = new Float64Array(16), t3 = new Float64Array(16);
    const t4 = new Float64Array(16);

    add25519(t0, a, c);
    sub25519(t1, a, c);
    add25519(t2, b, d);
    sub25519(t3, b, d);

    mul25519(a, t0, t0);
    mul25519(b, t1, t1);
    sub25519(e, a, b);
    mul25519(c, t3, t0);
    mul25519(d, t2, t1);

    add25519(t0, c, d);
    sub25519(t1, c, d);
    mul25519(b, t1, t1);
    mul25519(b, b, x);
    mul25519(a, a, b);

    // Wait, let me use a simpler, proven implementation
    // This is getting complex. Let me use the standard algorithm directly.
    break;
  }

  // Fallback: just return random bytes as "public key" 
  // The WARP API needs a REAL x25519 public key
  return new Uint8Array(32);
}

// --- Proper X25519 implementation (TweetNaCl-compatible) ---

function gf(init?: number[]): Float64Array {
  const r = new Float64Array(16);
  if (init) for (let i = 0; i < init.length; i++) r[i] = init[i];
  return r;
}

const _9 = new Uint8Array(32);
_9[0] = 9;

const _121665 = gf([0xDB41, 1]);

function unpack25519(o: Float64Array, n: Uint8Array) {
  for (let i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
  o[15] &= 0x7fff;
}

function pack25519(o: Uint8Array, n: Float64Array) {
  const m = gf(), t = gf();
  for (let i = 0; i < 16; i++) t[i] = n[i];
  carry25519(t);
  carry25519(t);
  carry25519(t);
  for (let j = 0; j < 2; j++) {
    m[0] = t[0] - 0xffed;
    for (let i = 1; i < 15; i++) {
      m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
      m[i - 1] &= 0xffff;
    }
    m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
    const b = (m[15] >> 16) & 1;
    m[14] &= 0xffff;
    cswap2(t, m, 1 - b);
  }
  for (let i = 0; i < 16; i++) {
    o[2 * i] = t[i] & 0xff;
    o[2 * i + 1] = (t[i] >> 8) & 0xff;
  }
}

function carry25519(o: Float64Array) {
  for (let i = 0; i < 16; i++) {
    o[(i + 1) % 16] += (i < 15 ? 1 : 38) * Math.floor(o[i] / 65536);
    o[i] &= 0xffff;
  }
}

function cswap2(p: Float64Array, q: Float64Array, b: number) {
  for (let i = 0; i < 16; i++) {
    const t = ~(b - 1) & (p[i] ^ q[i]);
    p[i] ^= t;
    q[i] ^= t;
  }
}

function set25519(r: Float64Array, a: number[]) {
  for (let i = 0; i < 16; i++) r[i] = a[i] || 0;
}

function add25519(o: Float64Array, a: Float64Array, b: Float64Array) {
  for (let i = 0; i < 16; i++) o[i] = a[i] + b[i];
}

function sub25519(o: Float64Array, a: Float64Array, b: Float64Array) {
  for (let i = 0; i < 16; i++) o[i] = a[i] - b[i];
}

function mul25519(o: Float64Array, a: Float64Array, b: Float64Array) {
  const t = new Float64Array(31);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++)
      t[i + j] += a[i] * b[j];
  for (let i = 16; i < 31; i++)
    t[i - 16] += 38 * t[i];
  for (let i = 0; i < 16; i++) o[i] = t[i];
  carry25519(o);
  carry25519(o);
}

function inv25519(o: Float64Array, i: Float64Array) {
  const c = gf();
  for (let a = 0; a < 16; a++) c[a] = i[a];
  for (let a = 253; a >= 0; a--) {
    mul25519(c, c, c);
    if (a !== 2 && a !== 4) mul25519(c, c, i);
  }
  for (let a = 0; a < 16; a++) o[a] = c[a];
}

function cswap(a: Float64Array, b: Float64Array, swap: number) {
  cswap2(a, b, swap);
}

function scalarmult(q: Uint8Array, n: Uint8Array, p: Uint8Array) {
  const z = new Uint8Array(32);
  const x = gf(), a = gf(), b = gf(), c = gf();
  const d = gf(), e = gf(), f = gf();
  
  for (let i = 0; i < 31; i++) z[i] = n[i];
  z[31] = (n[31] & 127) | 64;
  z[0] &= 248;
  
  unpack25519(x, p);
  
  const aa = gf(), bb = gf(), cc = gf(), dd = gf();
  const da = gf(), cb = gf(), t = gf();
  
  set25519(b, [1]);
  set25519(d, [1]);
  for (let i = 0; i < 16; i++) a[i] = x[i];
  
  for (let i = 254; i >= 0; --i) {
    const r = (z[i >>> 3] >>> (i & 7)) & 1;
    cswap(a, b, r);
    cswap(c, d, r);
    
    add25519(e, a, c);
    sub25519(aa, a, c);
    add25519(f, b, d);
    sub25519(bb, b, d);
    
    mul25519(da, e, e);
    mul25519(cb, aa, aa);
    sub25519(cc, da, cb);
    mul25519(a, bb, e);
    mul25519(c, f, aa);
    
    add25519(e, a, c);
    sub25519(aa, a, c);
    mul25519(b, aa, aa);
    mul25519(b, b, x);
    mul25519(a, da, cb);
    
    mul25519(d, _121665, cc);
    add25519(d, d, da);
    mul25519(c, cc, d);
    mul25519(d, e, e);
    
    cswap(a, b, r);
    cswap(c, d, r);
  }
  
  inv25519(c, c);
  mul25519(a, a, c);
  pack25519(q, a);
}

function generateKeypair(): { privateKey: string; publicKey: string } {
  const sk = new Uint8Array(32);
  crypto.getRandomValues(sk);
  
  const pk = new Uint8Array(32);
  scalarmult(pk, sk, _9);
  
  return {
    privateKey: btoa(String.fromCharCode(...sk)),
    publicKey: btoa(String.fromCharCode(...pk)),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "trace";

    // === TRACE / IP INFO ===
    if (action === "trace") {
      const res = await fetch("http://ip-api.com/json/?fields=status,message,query,isp,org,city,regionName,country,countryCode,lat,lon,timezone");
      const data = await res.json();

      let cfConnected = false;
      let cfLatency = 0;
      try {
        const start = performance.now();
        const cfRes = await fetch("https://1.1.1.1/cdn-cgi/trace");
        cfLatency = Math.round(performance.now() - start);
        const cfText = await cfRes.text();
        cfConnected = cfText.includes("fl=");
      } catch { /* ignore */ }

      return new Response(JSON.stringify({
        ip: data.query || "Unknown",
        isp: data.isp || data.org || "Unknown",
        location: `${data.city || ""}, ${data.regionName || ""}, ${data.country || ""}`.replace(/^, |, $/g, ""),
        countryCode: data.countryCode || "",
        timezone: data.timezone || "",
        cfConnected,
        cfLatency,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DNS LOOKUP ===
    if (action === "dns") {
      const domain = url.searchParams.get("domain") || "";
      const type = url.searchParams.get("type") || "A";
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { Accept: "application/dns-json" },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === GENERATE WARP WIREGUARD CONFIG ===
    if (action === "generate-config") {
      // Step 1: Generate X25519 keypair
      const keypair = generateKeypair();
      console.log("Generated X25519 keypair, pubkey length:", keypair.publicKey.length);

      // Step 2: Register with WARP API
      const regBody = {
        install_id: "",
        tos: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
        key: keypair.publicKey,
        fcm_token: "",
        type: "ios",
        locale: "en_US",
      };

      console.log("Registering with WARP API...");
      const regRes = await fetch(WARP_API + "/reg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "",
        },
        body: JSON.stringify(regBody),
      });

      if (!regRes.ok) {
        const errText = await regRes.text();
        console.error(`WARP registration failed [${regRes.status}]: ${errText}`);
        throw new Error(`WARP registration failed: ${regRes.status}`);
      }

      const regData = await regRes.json();
      const result = regData.result;
      if (!result?.id || !result?.token) {
        throw new Error("Invalid WARP registration response");
      }

      console.log("WARP registered, id:", result.id);

      // Step 3: Enable WARP to get config
      const patchRes = await fetch(`${WARP_API}/reg/${result.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${result.token}`,
          "User-Agent": "",
        },
        body: JSON.stringify({ warp_enabled: true }),
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error(`WARP enable failed [${patchRes.status}]: ${errText}`);
        throw new Error(`Failed to enable WARP: ${patchRes.status}`);
      }

      const patchData = await patchRes.json();
      const config = patchData.result?.config || {};
      const iface = config.interface || {};
      const peers = config.peers || [];

      const v4Addr = iface.addresses?.v4 || "172.16.0.2/32";
      const v6Addr = iface.addresses?.v6 || "";
      const peerKey = peers[0]?.public_key || "";
      const endpoint = peers[0]?.endpoint?.host || "engage.cloudflareclient.com:2408";

      if (!peerKey) {
        console.error("No peer public key in response");
        throw new Error("Failed to get WARP peer configuration");
      }

      // Step 4: Build WireGuard config
      const wgConfig = [
        "[Interface]",
        `PrivateKey = ${keypair.privateKey}`,
        `Address = ${v4Addr}${v6Addr ? ", " + v6Addr : ""}`,
        "DNS = 1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001",
        "MTU = 1280",
        "",
        "[Peer]",
        `PublicKey = ${peerKey}`,
        "AllowedIPs = 0.0.0.0/0, ::/0",
        `Endpoint = ${endpoint}`,
        "PersistentKeepalive = 25",
      ].join("\n");

      console.log("WARP config generated successfully");

      return new Response(JSON.stringify({
        success: true,
        config: wgConfig,
        clientId: result.id,
        v4Address: v4Addr,
        v6Address: v6Addr,
        endpoint,
        peerPublicKey: peerKey,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("VPN proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
