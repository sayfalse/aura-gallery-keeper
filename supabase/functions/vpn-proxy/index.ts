import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "trace";

    if (action === "trace") {
      // Use ip-api.com which has CORS-friendly responses
      const res = await fetch("http://ip-api.com/json/?fields=status,message,query,isp,org,city,regionName,country,countryCode,lat,lon,timezone");
      const data = await res.json();

      // Also check Cloudflare connectivity
      let cfConnected = false;
      let cfLatency = 0;
      try {
        const start = performance.now();
        const cfRes = await fetch("https://1.1.1.1/cdn-cgi/trace");
        cfLatency = Math.round(performance.now() - start);
        const cfText = await cfRes.text();
        cfConnected = cfText.includes("fl=");
      } catch {
        // Cloudflare not reachable
      }

      return new Response(JSON.stringify({
        ip: data.query || "Unknown",
        isp: data.isp || data.org || "Unknown",
        location: `${data.city || ""}, ${data.regionName || ""}, ${data.country || ""}`.replace(/^, |, $/g, ""),
        countryCode: data.countryCode || "",
        timezone: data.timezone || "",
        lat: data.lat,
        lon: data.lon,
        cfConnected,
        cfLatency,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
