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

    const userId = claimsData.claims.sub;
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

    // Check if this is a user-detail request
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get("userId");

    if (targetUserId) {
      return await handleUserDetail(adminClient, targetUserId, corsHeaders);
    }

    return await handleOverview(adminClient, corsHeaders);
  } catch (err) {
    console.error("Admin stats error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleUserDetail(adminClient: any, targetUserId: string, corsHeaders: Record<string, string>) {
  const [photosRes, notesRes, filesRes, contactsRes, profileRes] = await Promise.all([
    adminClient.from("photos").select("id, name, storage_path, size, favorite, deleted, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(100),
    adminClient.from("notes").select("id, title, content, folder, pinned, created_at, updated_at").eq("user_id", targetUserId).order("updated_at", { ascending: false }).limit(100),
    adminClient.from("drive_files").select("id, name, folder, mime_type, size_bytes, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(100),
    adminClient.from("contacts").select("id, first_name, last_name, email, phone, company, created_at").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(100),
    adminClient.from("profiles").select("display_name, username, avatar_url, created_at").eq("user_id", targetUserId).maybeSingle(),
  ]);

  return new Response(
    JSON.stringify({
      profile: profileRes.data,
      photos: photosRes.data || [],
      notes: notesRes.data || [],
      driveFiles: filesRes.data || [],
      contacts: contactsRes.data || [],
      counts: {
        photos: photosRes.data?.length || 0,
        notes: notesRes.data?.length || 0,
        driveFiles: filesRes.data?.length || 0,
        contacts: contactsRes.data?.length || 0,
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleOverview(adminClient: any, corsHeaders: Record<string, string>) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { count: totalUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });
  const { data: allUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const users = allUsers?.users || [];

  const recentSignups = users.filter((u: any) => new Date(u.created_at) >= sevenDaysAgo).length;

  const dailySignups: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailySignups[d.toISOString().split("T")[0]] = 0;
  }
  users.forEach((u: any) => {
    const day = u.created_at.split("T")[0];
    if (dailySignups[day] !== undefined) dailySignups[day]++;
  });

  const [photosRes, notesRes, filesRes, contactsRes, messagesRes, announcementsRes, profilesRes, allRolesRes, auditRes, recentPhotosRes, recentNotesRes, driveFilesAllRes] = await Promise.all([
    adminClient.from("photos").select("*", { count: "exact", head: true }),
    adminClient.from("notes").select("*", { count: "exact", head: true }),
    adminClient.from("drive_files").select("*", { count: "exact", head: true }),
    adminClient.from("contacts").select("*", { count: "exact", head: true }),
    adminClient.from("messages").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
    adminClient.from("announcements").select("*", { count: "exact", head: true }),
    adminClient.from("profiles").select("user_id, display_name, avatar_url, username, created_at").order("created_at", { ascending: false }).limit(50),
    adminClient.from("user_roles").select("user_id, role"),
    adminClient.from("admin_audit_log").select("id, admin_user_id, action, target_user_id, details, created_at").order("created_at", { ascending: false }).limit(50),
    adminClient.from("photos").select("id, name, created_at, user_id").order("created_at", { ascending: false }).limit(5),
    adminClient.from("notes").select("id, title, created_at, user_id").order("created_at", { ascending: false }).limit(5),
    adminClient.from("drive_files").select("user_id, size_bytes, mime_type").limit(1000),
  ]);

  // Build per-user storage breakdown
  const driveFiles = driveFilesAllRes.data || [];
  const storageByUser: Record<string, { totalBytes: number; fileCount: number; byType: Record<string, number> }> = {};
  for (const f of driveFiles) {
    if (!storageByUser[f.user_id]) storageByUser[f.user_id] = { totalBytes: 0, fileCount: 0, byType: {} };
    const entry = storageByUser[f.user_id];
    entry.totalBytes += f.size_bytes || 0;
    entry.fileCount += 1;
    const mime = f.mime_type || "";
    let cat = "Other";
    if (mime.startsWith("image/")) cat = "Images";
    else if (mime.startsWith("video/")) cat = "Videos";
    else if (mime.startsWith("audio/")) cat = "Audio";
    else if (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) cat = "Documents";
    entry.byType[cat] = (entry.byType[cat] || 0) + (f.size_bytes || 0);
  }
  const totalStorageBytes = driveFiles.reduce((acc: number, f: any) => acc + (f.size_bytes || 0), 0);

  const profiles = profilesRes.data || [];
  const allRoles = allRolesRes.data || [];
  const auditLogs = auditRes.data || [];

  const roleMap: Record<string, string> = {};
  allRoles.forEach((r: any) => { roleMap[r.user_id] = r.role; });

  const banMap: Record<string, string | null> = {};
  users.forEach((u: any) => { banMap[u.id] = u.banned_until || null; });

  const profileMap: Record<string, string> = {};
  profiles.forEach((p: any) => { profileMap[p.user_id] = p.display_name || p.username || "Unknown"; });

  const enrichedProfiles = profiles.map((p: any) => ({
    ...p,
    role: roleMap[p.user_id] || "user",
    email: users.find((u: any) => u.id === p.user_id)?.email || null,
    banned_until: banMap[p.user_id] || null,
    storage: storageByUser[p.user_id] || { totalBytes: 0, fileCount: 0, byType: {} },
  }));

  const enrichedAuditLogs = auditLogs.map((l: any) => ({
    ...l,
    admin_name: profileMap[l.admin_user_id] || "Admin",
    target_name: profileMap[l.target_user_id] || "User",
  }));

  return new Response(
    JSON.stringify({
      overview: {
        totalUsers: totalUsers || users.length,
        recentSignups,
        totalPhotos: photosRes.count || 0,
        totalNotes: notesRes.count || 0,
        totalFiles: filesRes.count || 0,
        totalContacts: contactsRes.count || 0,
        totalAnnouncements: announcementsRes.count || 0,
        recentMessages: messagesRes.count || 0,
      },
      dailySignups: Object.entries(dailySignups).map(([date, count]) => ({ date, count })),
      recentActivity: [
        ...(recentPhotosRes.data || []).map((p: any) => ({ type: "photo", id: p.id, title: p.name, user_id: p.user_id, created_at: p.created_at })),
        ...(recentNotesRes.data || []).map((n: any) => ({ type: "note", id: n.id, title: n.title, user_id: n.user_id, created_at: n.created_at })),
      ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
      users: enrichedProfiles,
      auditLog: enrichedAuditLogs,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
