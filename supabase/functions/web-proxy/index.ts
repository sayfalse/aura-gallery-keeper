/**
 * Web Proxy Edge Function
 * Supports both GET (for iframe src) and POST (for API calls).
 * Strips frame-blocking headers, rewrites internal links to go through proxy,
 * and injects a script to intercept navigation.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_URL = Deno.env.get("SUPABASE_URL") + "/functions/v1/web-proxy";

function getProxyUrl(targetUrl: string): string {
  return `${FUNCTION_URL}?url=${encodeURIComponent(targetUrl)}`;
}

// Script injected into HTML pages to intercept clicks and form submissions
function getInterceptScript(baseOrigin: string): string {
  return `
<script>
(function(){
  const PROXY_BASE = "${FUNCTION_URL}";
  function proxyUrl(url) {
    try {
      const u = new URL(url, document.baseURI);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return PROXY_BASE + '?url=' + encodeURIComponent(u.href);
      }
    } catch(e) {}
    return url;
  }
  
  // Intercept link clicks
  document.addEventListener('click', function(e) {
    let el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;
    
    try {
      const u = new URL(el.href);
      // Skip javascript: and blob: URLs
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      
      // Don't intercept target="_blank" - let them open normally
      if (el.target === '_blank') {
        e.preventDefault();
        window.open(el.href, '_blank');
        return;
      }
      
      e.preventDefault();
      window.location.href = proxyUrl(el.href);
    } catch(err) {}
  }, true);
  
  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form || !form.action) return;
    try {
      const u = new URL(form.action, document.baseURI);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      
      if (form.method && form.method.toLowerCase() === 'get') {
        e.preventDefault();
        const params = new URLSearchParams(new FormData(form));
        const targetUrl = u.origin + u.pathname + '?' + params.toString();
        window.location.href = proxyUrl(targetUrl);
      }
    } catch(err) {}
  }, true);
  
  // Override window.open
  const origOpen = window.open;
  window.open = function(url) {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      return origOpen.call(window, proxyUrl(url), '_self');
    }
    return origOpen.apply(window, arguments);
  };
  
  // Override fetch to allow API calls from the page
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      try {
        const u = new URL(input, document.baseURI);
        // Don't proxy same-function calls or data URLs
        if (input.includes('/functions/v1/web-proxy')) return origFetch.apply(window, arguments);
        // For API calls, try direct first (most will work for data fetching)
        return origFetch.apply(window, arguments);
      } catch(e) {}
    }
    return origFetch.apply(window, arguments);
  };
})();
</script>`;
}

async function handleProxy(targetUrl: string): Promise<Response> {
  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response(JSON.stringify({ error: "Only HTTP(S) allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "text/html";

    // For non-HTML content (images, CSS, JS, etc.), pass through directly
    if (!contentType.includes("text/html")) {
      const body = await response.arrayBuffer();
      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // For HTML, inject base tag + navigation interceptor
    let html = await response.text();
    
    const baseTag = `<base href="${parsed.origin}${parsed.pathname.substring(0, parsed.pathname.lastIndexOf('/') + 1) || '/'}" target="_self">`;
    const interceptScript = getInterceptScript(parsed.origin);
    
    // Inject base tag and script into head
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}${interceptScript}`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD>${baseTag}${interceptScript}`);
    } else if (html.includes("<html")) {
      html = html.replace(/<html([^>]*)>/, `<html$1><head>${baseTag}${interceptScript}</head>`);
    } else {
      html = `<head>${baseTag}${interceptScript}</head>` + html;
    }

    // Remove any existing base tags (except ours) that might conflict
    html = html.replace(/(<head[^>]*>[\s\S]*?)<base\s+href="[^"]*"[^>]*>/i, (match, before) => {
      // Keep only our injected base tag
      return before;
    });

    // Strip Content-Security-Policy meta tags that block framing
    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi, '');

    return new Response(html, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        // Explicitly DO NOT set X-Frame-Options or CSP frame-ancestors
      },
    });
  } catch (error) {
    return new Response(
      `<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:-apple-system,system-ui,sans-serif;background:#f8f9fa;color:#333;}
        @media(prefers-color-scheme:dark){body{background:#111;color:#ccc;}}
        .wrap{text-align:center;padding:2rem;max-width:320px;}
        h2{font-size:1.1rem;margin-bottom:0.5rem;}
        p{font-size:0.85rem;color:#888;margin-bottom:1.5rem;}
        a{display:inline-flex;padding:0.6rem 1.2rem;border-radius:12px;background:#3b82f6;color:#fff;text-decoration:none;font-size:0.85rem;font-weight:600;}
      </style></head>
      <body><div class="wrap">
        <div style="font-size:2.5rem;margin-bottom:1rem;">🌐</div>
        <h2>Can't reach this page</h2>
        <p>${error.message || 'Connection failed'}</p>
        <a href="${targetUrl}" target="_blank" rel="noopener">Open in browser ↗</a>
      </div></body></html>`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let targetUrl: string | null = null;

  // Support GET with ?url= parameter (for iframe src)
  if (req.method === "GET") {
    const url = new URL(req.url);
    targetUrl = url.searchParams.get("url");
  }
  
  // Support POST with JSON body (backward compat)
  if (req.method === "POST") {
    try {
      const body = await req.json();
      targetUrl = body.url;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!targetUrl || typeof targetUrl !== "string") {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return handleProxy(targetUrl);
});
