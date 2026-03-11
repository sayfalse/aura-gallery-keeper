import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Telegram webhook is now disabled for auto-announcements.
// Announcements are managed manually via the Admin Dashboard.
// This endpoint remains active only for health checks.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // POST requests from Telegram are now ignored (auto-announcements disabled)
  if (req.method === "POST") {
    console.log("Telegram webhook received but auto-announcements are disabled");
    return new Response(JSON.stringify({ ok: true, skipped: "auto_announcements_disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET - health check only
  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", message: "Telegram webhook active (auto-announcements disabled)" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
