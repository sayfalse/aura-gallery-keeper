import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ error: "Google OAuth credentials not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization");
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify user
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await supabaseUser.auth.getUser();
    if (!error && data.user) {
      userId = data.user.id;
    }
  }

  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  try {
    // Generate OAuth URL
    if (action === "auth-url" && req.method === "POST") {
      const { redirectUri } = await req.json();
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.labels",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
      });
      return new Response(
        JSON.stringify({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for tokens
    if (action === "callback" && req.method === "POST") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { code, redirectUri } = await req.json();
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user email from Google
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileRes.json();

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Upsert tokens
      const { error: upsertError } = await supabaseAdmin
        .from("gmail_tokens")
        .upsert(
          {
            user_id: userId,
            email: profile.email,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
          },
          { onConflict: "user_id,email" }
        );

      if (upsertError) {
        return new Response(JSON.stringify({ error: "Failed to store tokens", details: upsertError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, email: profile.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require auth
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get accounts
    if (action === "accounts" && req.method === "GET") {
      const { data } = await supabaseAdmin
        .from("gmail_tokens")
        .select("email, created_at")
        .eq("user_id", userId);
      return new Response(JSON.stringify({ accounts: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove account
    if (action === "remove-account" && req.method === "POST") {
      const { email } = await req.json();
      await supabaseAdmin
        .from("gmail_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("email", email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: get valid access token (refresh if expired)
    const getAccessToken = async (email: string): Promise<string> => {
      const { data: tokenRow } = await supabaseAdmin
        .from("gmail_tokens")
        .select("*")
        .eq("user_id", userId!)
        .eq("email", email)
        .single();

      if (!tokenRow) throw new Error("Account not found");

      // Check if token is expired (with 60s buffer)
      if (new Date(tokenRow.expires_at) <= new Date(Date.now() + 60000)) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenRow.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        const refreshData = await refreshRes.json();
        if (!refreshRes.ok) throw new Error("Token refresh failed");

        const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
        await supabaseAdmin
          .from("gmail_tokens")
          .update({
            access_token: refreshData.access_token,
            expires_at: newExpiry,
          })
          .eq("user_id", userId!)
          .eq("email", email);

        return refreshData.access_token;
      }

      return tokenRow.access_token;
    };

    // Gmail API proxy calls
    const body = req.method === "POST" ? await req.json() : null;
    const emailParam = url.searchParams.get("email") || body?.email;

    if (!emailParam) {
      return new Response(JSON.stringify({ error: "email parameter required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken(emailParam);
    const gmailHeaders = { Authorization: `Bearer ${accessToken}` };

    // List messages
    if (action === "messages" && req.method === "GET") {
      const maxResults = url.searchParams.get("maxResults") || "20";
      const labelIds = url.searchParams.get("labelIds") || "INBOX";
      const q = url.searchParams.get("q") || "";
      const pageToken = url.searchParams.get("pageToken") || "";

      const params = new URLSearchParams({ maxResults, labelIds });
      if (q) params.set("q", q);
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`${GMAIL_API}/messages?${params}`, { headers: gmailHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(`Gmail API error [${res.status}]: ${JSON.stringify(data)}`);

      // Fetch full message details for each
      const messages = data.messages || [];
      const detailed = await Promise.all(
        messages.slice(0, 20).map(async (m: { id: string }) => {
          const msgRes = await fetch(`${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`, {
            headers: gmailHeaders,
          });
          return msgRes.json();
        })
      );

      return new Response(
        JSON.stringify({ messages: detailed, nextPageToken: data.nextPageToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get single message
    if (action === "message" && req.method === "GET") {
      const messageId = url.searchParams.get("id");
      const res = await fetch(`${GMAIL_API}/messages/${messageId}?format=full`, {
        headers: gmailHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Gmail API error [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send message
    if (action === "send" && req.method === "POST") {
      const { to, subject, body: msgBody, inReplyTo, references, threadId } = body;

      const boundary = "boundary_" + Date.now();
      let raw = `From: me\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n`;
      if (inReplyTo) raw += `In-Reply-To: ${inReplyTo}\r\nReferences: ${references || inReplyTo}\r\n`;
      raw += `\r\n${msgBody}`;

      // Base64url encode
      const encoded = btoa(unescape(encodeURIComponent(raw)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const sendBody: Record<string, string> = { raw: encoded };
      if (threadId) sendBody.threadId = threadId;

      const res = await fetch(`${GMAIL_API}/messages/send`, {
        method: "POST",
        headers: { ...gmailHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(sendBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Gmail send error [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Modify message (star, archive, trash, mark read/unread)
    if (action === "modify" && req.method === "POST") {
      const { messageId, addLabelIds, removeLabelIds } = body;
      const res = await fetch(`${GMAIL_API}/messages/${messageId}/modify`, {
        method: "POST",
        headers: { ...gmailHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ addLabelIds: addLabelIds || [], removeLabelIds: removeLabelIds || [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Gmail modify error [${res.status}]: ${JSON.stringify(data)}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trash message
    if (action === "trash" && req.method === "POST") {
      const { messageId } = body;
      const res = await fetch(`${GMAIL_API}/messages/${messageId}/trash`, {
        method: "POST",
        headers: gmailHeaders,
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get labels
    if (action === "labels" && req.method === "GET") {
      const res = await fetch(`${GMAIL_API}/labels`, { headers: gmailHeaders });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Gmail proxy error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
