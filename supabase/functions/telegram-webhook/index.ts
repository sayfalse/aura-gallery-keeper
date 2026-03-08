import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (req.method === "POST") {
      // Validate the request comes from Telegram using a secret token in the URL
      const url = new URL(req.url);
      const secret = url.searchParams.get("secret");
      if (!TELEGRAM_BOT_TOKEN || secret !== TELEGRAM_BOT_TOKEN) {
        console.warn("Unauthorized webhook attempt");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      console.log("Telegram update received:", JSON.stringify(body));

      // Handle channel_post (posts from a channel)
      const post = body.channel_post || body.message;
      if (!post) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const text = post.text || post.caption || "";
      if (!text.trim()) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_text" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse type from hashtags
      let type = "update";
      if (text.includes("#announcement")) type = "announcement";
      else if (text.includes("#maintenance")) type = "maintenance";
      else if (text.includes("#feature")) type = "feature";

      // Extract title (first line) and content (rest)
      const lines = text.split("\n");
      const title = lines[0]
        .replace(/#\w+/g, "")
        .trim()
        .substring(0, 200);
      const content = lines.length > 1 ? lines.slice(1).join("\n").trim() : title;

      const { error } = await supabase.from("announcements").insert({
        telegram_message_id: post.message_id,
        title: title || null,
        content: content || text,
        author: post.chat?.title || "Aura Team",
        type,
      });

      if (error) {
        console.error("DB insert error:", error);
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET - setup webhook or health check
    if (req.method === "GET") {
      const url = new URL(req.url);
      const setup = url.searchParams.get("setup");

      if (setup === "true") {
        const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (!BOT_TOKEN) {
          return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
        const telegramRes = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
          }
        );
        const result = await telegramRes.json();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: "ok", message: "Telegram webhook active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
