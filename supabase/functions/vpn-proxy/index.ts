import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WARP_API = "https://api.cloudflareclient.com/v0a2158/reg";

// Generate a WireGuard keypair using Deno's crypto
async function generateKeypair() {
  // Generate 32 random bytes for private key
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  
  // Clamp private key per Curve25519 spec
  privateKeyBytes[0] &= 248;
  privateKeyBytes[31] &= 127;
  privateKeyBytes[31] |= 64;
  
  const privateKey = btoa(String.fromCharCode(...privateKeyBytes));
  
  // We'll use the WARP API which accepts our public key
  // For WireGuard, we need to derive public key from private key
  // Since Deno doesn't have native x25519, we'll let the API handle key generation
  return { privateKey };
}

function generateInstallId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 22; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
      const installId = generateInstallId();

      const regBody = {
        key: "", // Will be filled by WARP
        install_id: installId,
        fcm_token: installId + ":APA91b" + generateInstallId(),
        tos: new Date().toISOString().replace(/\.\d{3}Z$/, ".000+00:00"),
        model: "PC",
        serial_number: installId,
        locale: "en_US",
      };

      console.log("Registering with WARP API...");
      
      const regRes = await fetch(WARP_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "okhttp/3.12.1",
          "CF-Client-Version": "a-6.10-2158",
        },
        body: JSON.stringify(regBody),
      });

      if (!regRes.ok) {
        const errText = await regRes.text();
        console.error(`WARP registration failed [${regRes.status}]: ${errText}`);
        throw new Error(`WARP registration failed: ${regRes.status}`);
      }

      const regData = await regRes.json();
      console.log("WARP registration successful");

      // Extract config data
      const config = regData.config || {};
      const iface = config.interface || {};
      const peers = config.peers || [];
      const clientId = regData.id || "";
      const token = regData.token || "";
      const accountId = regData.account?.id || "";

      // Get the device's private key by making a second request
      const keyRes = await fetch(`https://api.cloudflareclient.com/v0a2158/reg/${clientId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "User-Agent": "okhttp/3.12.1",
          "CF-Client-Version": "a-6.10-2158",
        },
      });

      let privateKey = "";
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        privateKey = keyData.config?.client_id || "";
      }

      // Build WireGuard config
      const v4Addr = iface.addresses?.v4 || "172.16.0.2/32";
      const v6Addr = iface.addresses?.v6 || "";
      const peerKey = peers[0]?.public_key || "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=";
      const endpoint = peers[0]?.endpoint?.host || "engage.cloudflareclient.com:2408";

      const wgConfig = [
        "[Interface]",
        `PrivateKey = ${privateKey || "YOUR_PRIVATE_KEY_HERE"}`,
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

      return new Response(JSON.stringify({
        success: true,
        config: wgConfig,
        clientId,
        v4Address: v4Addr,
        v6Address: v6Addr,
        endpoint,
        peerPublicKey: peerKey,
        accountId,
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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
