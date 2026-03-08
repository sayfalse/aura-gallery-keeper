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

    // Verify the caller is an admin
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

    const userId = claimsData.claims.sub;

    // Use service role to check admin status
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch stats using service role
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total users
    const { count: totalUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });

    // Get all users for recent signups
    const { data: allUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const users = allUsers?.users || [];
    
    const recentSignups = users.filter(
      (u) => new Date(u.created_at) >= sevenDaysAgo
    ).length;

    // Daily signups for chart (last 30 days)
    const dailySignups: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailySignups[d.toISOString().split("T")[0]] = 0;
    }
    users.forEach((u) => {
      const day = u.created_at.split("T")[0];
      if (dailySignups[day] !== undefined) dailySignups[day]++;
    });

    // Photos count
    const { count: totalPhotos } = await adminClient
      .from("photos")
      .select("*", { count: "exact", head: true });

    // Notes count
    const { count: totalNotes } = await adminClient
      .from("notes")
      .select("*", { count: "exact", head: true });

    // Drive files count
    const { count: totalFiles } = await adminClient
      .from("drive_files")
      .select("*", { count: "exact", head: true });

    // Contacts count
    const { count: totalContacts } = await adminClient
      .from("contacts")
      .select("*", { count: "exact", head: true });

    // Messages count (last 7 days)
    const { count: recentMessages } = await adminClient
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Recent activity (last 10 photos uploaded)
    const { data: recentPhotos } = await adminClient
      .from("photos")
      .select("id, name, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5);

    // Recent notes
    const { data: recentNotes } = await adminClient
      .from("notes")
      .select("id, title, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5);

    // User list with profiles
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, display_name, avatar_url, username, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch roles for all users
    const { data: allRoles } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    const roleMap: Record<string, string> = {};
    (allRoles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    // Get ban status from auth users
    const banMap: Record<string, string | null> = {};
    users.forEach((u: any) => {
      banMap[u.id] = u.banned_until || null;
    });

    // Announcements count
    const { count: totalAnnouncements } = await adminClient
      .from("announcements")
      .select("*", { count: "exact", head: true });

    const enrichedProfiles = (profiles || []).map((p: any) => ({
      ...p,
      role: roleMap[p.user_id] || "user",
      email: users.find((u: any) => u.id === p.user_id)?.email || null,
      banned_until: banMap[p.user_id] || null,
    }));

    // Audit log (last 50)
    const { data: auditLogs } = await adminClient
      .from("admin_audit_log")
      .select("id, admin_user_id, action, target_user_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    // Map admin/target user IDs to display names for audit
    const allUserIds = new Set<string>();
    (auditLogs || []).forEach((l: any) => {
      allUserIds.add(l.admin_user_id);
      allUserIds.add(l.target_user_id);
    });
    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.user_id] = p.display_name || p.username || "Unknown";
    });

    const enrichedAuditLogs = (auditLogs || []).map((l: any) => ({
      ...l,
      admin_name: profileMap[l.admin_user_id] || "Admin",
      target_name: profileMap[l.target_user_id] || "User",
    }));

    return new Response(
      JSON.stringify({
        overview: {
          totalUsers: totalUsers || users.length,
          recentSignups,
          totalPhotos: totalPhotos || 0,
          totalNotes: totalNotes || 0,
          totalFiles: totalFiles || 0,
          totalContacts: totalContacts || 0,
          totalAnnouncements: totalAnnouncements || 0,
          recentMessages: recentMessages || 0,
        },
        dailySignups: Object.entries(dailySignups).map(([date, count]) => ({
          date,
          count,
        })),
        recentActivity: [
          ...(recentPhotos || []).map((p: any) => ({
            type: "photo",
            id: p.id,
            title: p.name,
            user_id: p.user_id,
            created_at: p.created_at,
          })),
          ...(recentNotes || []).map((n: any) => ({
            type: "note",
            id: n.id,
            title: n.title,
            user_id: n.user_id,
            created_at: n.created_at,
          })),
        ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
        users: enrichedProfiles,
        auditLog: enrichedAuditLogs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
