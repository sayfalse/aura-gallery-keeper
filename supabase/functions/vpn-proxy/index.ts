import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WARP_API = "https://api.cloudflareclient.com/v0i1909051800";

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

    // === WARP API PROXY (register) ===
    if (action === "warp-register") {
      const body = await req.json();
      console.log("Proxying WARP registration, key length:", body.key?.length);

      const regRes = await fetch(WARP_API + "/reg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "",
        },
        body: JSON.stringify(body),
      });

      const regText = await regRes.text();
      console.log("WARP register response:", regRes.status);

      return new Response(regText, {
        status: regRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === WARP API PROXY (enable) ===
    if (action === "warp-enable") {
      const body = await req.json();
      const { id, token } = body;

      console.log("Proxying WARP enable for id:", id);

      const patchRes = await fetch(`${WARP_API}/reg/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "User-Agent": "",
        },
        body: JSON.stringify({ warp_enabled: true }),
      });

      const patchText = await patchRes.text();
      console.log("WARP enable response:", patchRes.status);

      return new Response(patchText, {
        status: patchRes.status,
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
