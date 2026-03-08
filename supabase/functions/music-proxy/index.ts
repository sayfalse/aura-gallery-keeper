import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Multiple fallback API instances
const API_URLS = [
  "https://jiosaavn-api-privatecvc2.vercel.app/api",
  "https://saavn.dev/api",
  "https://jiosaavn-api-sigma.vercel.app/api",
  "https://jiosaavn-api-wine.vercel.app/api",
];

async function fetchWithFallback(path: string): Promise<any> {
  let lastError: Error | null = null;

  for (const baseUrl of API_URLS) {
    try {
      const url = `${baseUrl}${path}`;
      console.log(`Trying: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MusicProxy/1.0)",
        }
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Success from: ${baseUrl}`);
        return data;
      }
      console.log(`Failed ${response.status} from: ${baseUrl}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.log(`Error from ${baseUrl}: ${lastError.message}`);
    }
  }
  
  throw lastError || new Error("All API instances failed");
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

    let apiPath = "";

    switch (path) {
      case "search":
        apiPath = `/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
        break;
      case "song":
        apiPath = `/songs/${id}`;
        break;
      case "suggestions":
        apiPath = `/songs/${id}/suggestions?limit=${limit}`;
        break;
      default:
        return new Response(JSON.stringify({ error: "Invalid path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const data = await fetchWithFallback(apiPath);

    return new Response(JSON.stringify(data), {
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
