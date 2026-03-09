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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, targetUserId, role, quotaBytes } = body;

    if (!targetUserId || !action) {
      return new Response(JSON.stringify({ error: "Missing action or targetUserId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === callerUserId) {
      return new Response(JSON.stringify({ error: "Cannot modify your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any = { success: true };
    let auditDetails = "";

    switch (action) {
      case "set_role": {
        if (!role || !["admin", "moderator", "user"].includes(role)) {
          return new Response(JSON.stringify({ error: "Invalid role" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: currentRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", targetUserId)
          .maybeSingle();

        const prevRole = currentRole?.role || "user";

        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId);

        if (role !== "user") {
          const { error: insertErr } = await adminClient
            .from("user_roles")
            .insert({ user_id: targetUserId, role });

          if (insertErr) {
            console.error("Role insert error:", insertErr);
            return new Response(JSON.stringify({ error: "Failed to update role" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        auditDetails = `Role changed from ${prevRole} to ${role}`;
        result.message = `Role set to ${role}`;
        break;
      }

      case "ban_user": {
        const { error: banErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "876000h",
        });

        if (banErr) {
          console.error("Ban error:", banErr);
          return new Response(JSON.stringify({ error: "Failed to ban user" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        auditDetails = "User banned";
        result.message = "User banned";
        break;
      }

      case "unban_user": {
        const { error: unbanErr } = await adminClient.auth.admin.updateUserById(targetUserId, {
          ban_duration: "none",
        });

        if (unbanErr) {
          console.error("Unban error:", unbanErr);
          return new Response(JSON.stringify({ error: "Failed to unban user" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        auditDetails = "User unbanned";
        result.message = "User unbanned";
        break;
      }

      case "set_quota": {
        if (typeof quotaBytes !== "number" || quotaBytes < 0) {
          return new Response(JSON.stringify({ error: "Invalid quota value" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: quotaErr } = await adminClient
          .from("storage_quotas")
          .upsert(
            { user_id: targetUserId, quota_bytes: quotaBytes, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );

        if (quotaErr) {
          console.error("Quota error:", quotaErr);
          return new Response(JSON.stringify({ error: "Failed to update quota" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const quotaGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(2);
        auditDetails = `Storage quota set to ${quotaGB} GB`;
        result.message = `Storage quota set to ${quotaGB} GB`;
        break;
      }

      case "export_data": {
        const format = role || "CSV";
        auditDetails = `User data exported as ${format}`;
        result.message = `Data exported as ${format}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    await adminClient.from("admin_audit_log").insert({
      admin_user_id: callerUserId,
      action,
      target_user_id: targetUserId,
      details: auditDetails,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin manage user error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
