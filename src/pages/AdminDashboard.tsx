import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Users, Image, StickyNote, HardDrive, MessageCircle,
  UserPlus, Megaphone, Contact, ArrowLeft, Shield,
  TrendingUp, Activity, Clock, Ban, ShieldCheck, ShieldAlert,
  ChevronDown, UserCog, Loader2, Search, Filter, FileText,
  ArrowUpDown, Download, Eye, X, Database
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  email: string | null;
  created_at: string;
  role: string;
  banned_until: string | null;
  storage?: { totalBytes: number; fileCount: number; byType: Record<string, number> };
  quotaBytes?: number;
}

interface AuditEntry {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string;
  details: string | null;
  created_at: string;
  admin_name: string;
  target_name: string;
}

interface AdminStats {
  overview: {
    totalUsers: number;
    recentSignups: number;
    totalPhotos: number;
    totalNotes: number;
    totalFiles: number;
    totalContacts: number;
    totalAnnouncements: number;
    recentMessages: number;
    totalStorageBytes: number;
  };
  dailySignups: { date: string; count: number }[];
  recentActivity: {
    type: string;
    id: string;
    title: string;
    user_id: string;
    created_at: string;
  }[];
  users: UserProfile[];
  auditLog: AuditEntry[];
}

interface UserDetailData {
  profile: any;
  photos: any[];
  notes: any[];
  driveFiles: any[];
  contacts: any[];
  counts: { photos: number; notes: number; driveFiles: number; contacts: number };
}

const statCards = [
  { key: "totalUsers", label: "Total Users", icon: Users, gradient: "from-blue-500 to-cyan-400" },
  { key: "recentSignups", label: "New (7d)", icon: UserPlus, gradient: "from-emerald-400 to-teal-500" },
  { key: "totalPhotos", label: "Photos", icon: Image, gradient: "from-violet-500 to-purple-400" },
  { key: "totalNotes", label: "Notes", icon: StickyNote, gradient: "from-amber-400 to-orange-500" },
  { key: "totalFiles", label: "Drive Files", icon: HardDrive, gradient: "from-sky-400 to-blue-600" },
  { key: "totalContacts", label: "Contacts", icon: Contact, gradient: "from-pink-400 to-rose-500" },
  { key: "recentMessages", label: "Messages (7d)", icon: MessageCircle, gradient: "from-cyan-400 to-sky-500" },
  { key: "totalAnnouncements", label: "Announcements", icon: Megaphone, gradient: "from-indigo-400 to-blue-500" },
];

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  moderator: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  user: "bg-muted text-muted-foreground border-border",
};

type RoleFilter = "all" | "admin" | "moderator" | "user" | "banned";

const auditActionLabels: Record<string, { label: string; color: string }> = {
  set_role: { label: "Role Changed", color: "bg-primary/10 text-primary" },
  ban_user: { label: "User Banned", color: "bg-destructive/10 text-destructive" },
  unban_user: { label: "User Unbanned", color: "bg-emerald-500/10 text-emerald-600" },
};

// CSV export helper
const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
  const escape = (val: string) => `"${String(val ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => {} });

  // User detail inspection
  const [inspectUser, setInspectUser] = useState<UserProfile | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  }, []);

  const fetchStats = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const token = await getToken();
      if (!token) { setError("Not authenticated"); setLoading(false); return; }
      const { data, error: fnError } = await supabase.functions.invoke("admin-stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (fnError) { if (!isRefresh) setError(fnError.message || "Failed to load"); }
      else if (data?.error) { if (!isRefresh) setError(data.error); }
      else { setStats(data); setError(null); }
    } catch (e: any) {
      if (!isRefresh) setError(e.message || "Unknown error");
    } finally { setLoading(false); }
  }, [getToken]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const fetchUserDetail = useCallback(async (targetUserId: string) => {
    setDetailLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-stats?userId=${targetUserId}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUserDetail(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setDetailLoading(false); }
  }, [getToken, toast]);

  const openInspect = (profile: UserProfile) => {
    setInspectUser(profile);
    setUserDetail(null);
    fetchUserDetail(profile.user_id);
  };

  const manageUser = useCallback(async (action: string, targetUserId: string, role?: string, quotaBytes?: number) => {
    setActionLoading(targetUserId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const { data, error: fnError } = await supabase.functions.invoke("admin-manage-user", {
        headers: { Authorization: `Bearer ${token}` },
        body: { action, targetUserId, role, quotaBytes },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Success", description: data?.message || "Action completed" });
      await fetchStats(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setActionLoading(null); }
  }, [getToken, fetchStats, toast]);

  const confirmAction = (title: string, description: string, action: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const isBanned = (u: UserProfile) => u.banned_until ? new Date(u.banned_until) > new Date() : false;

  const filteredUsers = useMemo(() => {
    if (!stats) return [];
    let users = stats.users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      users = users.filter((u) =>
        (u.display_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q)
      );
    }
    if (roleFilter === "banned") users = users.filter(isBanned);
    else if (roleFilter !== "all") users = users.filter((u) => u.role === roleFilter);
    return users;
  }, [stats, searchQuery, roleFilter]);

  // CSV exports
  const exportUsersCSV = () => {
    if (!stats) return;
    const headers = ["User ID", "Display Name", "Username", "Email", "Role", "Banned", "Joined"];
    const rows = stats.users.map((u) => [
      u.user_id, u.display_name || "", u.username || "", u.email || "",
      u.role, isBanned(u) ? "Yes" : "No", u.created_at,
    ]);
    downloadCSV(`users_export_${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    toast({ title: "Exported", description: `${rows.length} users exported as CSV` });
  };

  const exportAuditCSV = () => {
    if (!stats) return;
    const headers = ["ID", "Admin", "Action", "Target", "Details", "Timestamp"];
    const rows = stats.auditLog.map((e) => [
      e.id, e.admin_name, e.action, e.target_name, e.details || "", e.created_at,
    ]);
    downloadCSV(`audit_log_${new Date().toISOString().split("T")[0]}.csv`, headers, rows);
    toast({ title: "Exported", description: `${rows.length} audit entries exported as CSV` });
  };

  const exportUserDataCSV = () => {
    if (!userDetail || !inspectUser) return;
    const sections: string[][] = [];
    sections.push(["=== USER DATA EXPORT ===", "", "", "", ""]);
    sections.push(["User", inspectUser.display_name || "", inspectUser.email || "", "", ""]);
    sections.push([]);
    sections.push(["=== PHOTOS ===", "", "", "", ""]);
    sections.push(["Name", "Size", "Favorite", "Deleted", "Created"]);
    userDetail.photos.forEach((p) => sections.push([p.name, p.size || "", p.favorite ? "Yes" : "No", p.deleted ? "Yes" : "No", p.created_at]));
    sections.push([]);
    sections.push(["=== NOTES ===", "", "", "", ""]);
    sections.push(["Title", "Folder", "Pinned", "Created", "Updated"]);
    userDetail.notes.forEach((n) => sections.push([n.title, n.folder || "", n.pinned ? "Yes" : "No", n.created_at, n.updated_at]));
    sections.push([]);
    sections.push(["=== DRIVE FILES ===", "", "", "", ""]);
    sections.push(["Name", "Folder", "Type", "Size (bytes)", "Created"]);
    userDetail.driveFiles.forEach((f) => sections.push([f.name, f.folder || "/", f.mime_type || "", String(f.size_bytes || 0), f.created_at]));
    sections.push([]);
    sections.push(["=== CONTACTS ===", "", "", "", ""]);
    sections.push(["First Name", "Last Name", "Email", "Phone", "Company"]);
    userDetail.contacts.forEach((c) => sections.push([c.first_name, c.last_name || "", c.email || "", c.phone || "", c.company || ""]));

    const csv = sections.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user_data_${(inspectUser.display_name || inspectUser.user_id).replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "User data exported as CSV" });
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const formatChartDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };
  const formatTimestamp = (dateStr: string) => new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-5 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-48 h-8" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-5 pt-[env(safe-area-inset-top)] py-5 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">System overview & analytics</p>
          </div>
        </div>
        {/* Global exports */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportUsersCSV} className="text-xs gap-2">
              <Users className="w-3.5 h-3.5" /> Export Users CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAuditCSV} className="text-xs gap-2">
              <FileText className="w-3.5 h-3.5" /> Export Audit Log CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="px-5 py-6 pb-28 space-y-6 max-w-6xl mx-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <motion.div key={card.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }}>
              <Card className="border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <card.icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{(stats.overview as any)[card.key]?.toLocaleString() ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Signups chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> User Signups (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailySignups}>
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }} labelFormatter={formatChartDate} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#signupGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Management */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" /> User Management
                  <Badge variant="secondary" className="text-[10px] ml-1">{filteredUsers.length} of {stats.users.length}</Badge>
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search by name, email, or username..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0">
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{roleFilter === "all" ? "All Roles" : roleFilter === "banned" ? "Banned" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1) + "s"}</span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {(["all", "admin", "moderator", "user", "banned"] as RoleFilter[]).map((f) => (
                      <DropdownMenuItem key={f} onClick={() => setRoleFilter(f)} className={`text-xs ${roleFilter === f ? "font-semibold" : ""}`}>
                        {f === "all" ? "All Roles" : f === "banned" ? "🚫 Banned" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{searchQuery || roleFilter !== "all" ? "No users match your filters" : "No users yet"}</p>
                </div>
              ) : (
                filteredUsers.map((profile) => {
                  const banned = isBanned(profile);
                  const isCurrentUser = profile.user_id === user?.id;
                  const isLoading = actionLoading === profile.user_id;
                  return (
                    <div key={profile.user_id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${banned ? "bg-destructive/5 border border-destructive/10" : "bg-muted/40 hover:bg-muted/60"}`}>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(profile.display_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-medium text-foreground truncate">{profile.display_name || "Unknown"}</p>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${roleBadgeStyles[profile.role] || roleBadgeStyles.user}`}>{profile.role}</Badge>
                          {banned && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4"><Ban className="w-2.5 h-2.5 mr-0.5" /> Banned</Badge>}
                          {isCurrentUser && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">You</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{profile.email || `@${profile.username || "no-username"}`}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex shrink-0">{formatDate(profile.created_at)}</Badge>

                      {/* View user data button */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openInspect(profile)} title="View user data">
                        <Eye className="w-4 h-4" />
                      </Button>

                      {!isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isLoading}>
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Change Role</DropdownMenuLabel>
                            {["admin", "moderator", "user"].map((r) => (
                              <DropdownMenuItem key={r} disabled={profile.role === r}
                                onClick={() => confirmAction(`Set role to ${r}?`, `This will change ${profile.display_name || "this user"}'s role to ${r}.`, () => manageUser("set_role", profile.user_id, r))}
                                className="text-xs">
                                {r === "admin" && <ShieldAlert className="w-3.5 h-3.5 mr-2 text-destructive" />}
                                {r === "moderator" && <ShieldCheck className="w-3.5 h-3.5 mr-2 text-amber-500" />}
                                {r === "user" && <Users className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
                                {r.charAt(0).toUpperCase() + r.slice(1)}{profile.role === r && " (current)"}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {banned ? (
                              <DropdownMenuItem onClick={() => confirmAction("Unban user?", `Restore ${profile.display_name || "this user"}'s access.`, () => manageUser("unban_user", profile.user_id))} className="text-xs text-emerald-600">
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => confirmAction("Ban user?", `Permanently block ${profile.display_name || "this user"}.`, () => manageUser("ban_user", profile.user_id))} className="text-xs text-destructive">
                                <Ban className="w-3.5 h-3.5 mr-2" /> Ban User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Audit Log */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Admin Audit Log
                    {stats.auditLog?.length > 0 && <Badge variant="secondary" className="text-[10px]">{stats.auditLog.length}</Badge>}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={exportAuditCSV} className="h-7 text-[10px] gap-1">
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {!stats.auditLog || stats.auditLog.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No admin actions recorded yet</p>
                  </div>
                ) : (
                  stats.auditLog.map((entry) => {
                    const actionMeta = auditActionLabels[entry.action] || { label: entry.action, color: "bg-muted text-muted-foreground" };
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionMeta.color}`}>
                          {entry.action === "ban_user" && <Ban className="w-4 h-4" />}
                          {entry.action === "unban_user" && <ShieldCheck className="w-4 h-4" />}
                          {entry.action === "set_role" && <ArrowUpDown className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{actionMeta.label}</p>
                          <p className="text-[10px] text-muted-foreground"><span className="font-medium">{entry.admin_name}</span> → <span className="font-medium">{entry.target_name}</span></p>
                          {entry.details && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{entry.details}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{formatTimestamp(entry.created_at)}</span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  stats.recentActivity.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === "photo" ? "bg-violet-500/10 text-violet-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {item.type === "photo" ? <Image className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground">{item.type === "photo" ? "Photo uploaded" : "Note created"}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(item.created_at)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Storage Usage Per User with Quota Management */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" /> Storage Usage & Quotas
                <Badge variant="secondary" className="text-[10px] ml-1">{formatBytes(stats.overview.totalStorageBytes || 0)} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Show all users sorted by usage (including zero-usage for quota management)
                const sortedUsers = [...stats.users].sort((a, b) => (b.storage?.totalBytes || 0) - (a.storage?.totalBytes || 0));

                if (sortedUsers.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">No users yet</p>;
                }

                return (
                  <div className="space-y-3">
                    {sortedUsers.slice(0, 15).map((u) => {
                      const bytes = u.storage?.totalBytes || 0;
                      const quota = u.quotaBytes || 1073741824;
                      const pctOfQuota = Math.min((bytes / quota) * 100, 100);
                      const isNearLimit = pctOfQuota >= 80;
                      const isOverLimit = pctOfQuota >= 100;
                      const typeEntries = Object.entries(u.storage?.byType || {}).sort((a, b) => b[1] - a[1]);

                      return (
                        <div key={u.user_id} className={`p-2.5 rounded-xl ${isOverLimit ? "bg-destructive/5 border border-destructive/10" : "bg-muted/30"}`}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                {(u.display_name || "U")[0].toUpperCase()}
                              </div>
                              <span className="text-foreground font-medium truncate">{u.display_name || "Unknown"}</span>
                              <span className="text-muted-foreground shrink-0">{u.storage?.fileCount || 0} files</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className={`font-semibold ${isOverLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-foreground"}`}>
                                {formatBytes(bytes)}
                              </span>
                              <span className="text-muted-foreground">/</span>
                              {/* Quota selector */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="text-xs font-medium text-primary hover:underline cursor-pointer">
                                    {formatBytes(quota)}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuLabel className="text-xs">Set Quota</DropdownMenuLabel>
                                  {[
                                    { label: "500 MB", bytes: 524288000 },
                                    { label: "1 GB", bytes: 1073741824 },
                                    { label: "2 GB", bytes: 2147483648 },
                                    { label: "5 GB", bytes: 5368709120 },
                                    { label: "10 GB", bytes: 10737418240 },
                                    { label: "Unlimited", bytes: 107374182400 },
                                  ].map((opt) => (
                                    <DropdownMenuItem
                                      key={opt.bytes}
                                      className={`text-xs ${quota === opt.bytes ? "font-bold" : ""}`}
                                      onClick={() =>
                                        confirmAction(
                                          `Set quota to ${opt.label}?`,
                                          `This will set ${u.display_name || "this user"}'s storage limit to ${opt.label}.`,
                                          () => manageUser("set_quota", u.user_id, undefined, opt.bytes)
                                        )
                                      }
                                    >
                                      {opt.label} {quota === opt.bytes && "✓"}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"}`}
                              style={{ width: `${Math.max(pctOfQuota, 1)}%` }}
                            />
                          </div>
                          {typeEntries.length > 0 && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {typeEntries.map(([cat, size]) => (
                                <span key={cat} className="text-[9px] text-muted-foreground">{cat}: {formatBytes(size)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {sortedUsers.length > 15 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">+{sortedUsers.length - 15} more users</p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Role Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const roleCounts = stats.users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
                const bannedCount = stats.users.filter(isBanned).length;
                return (
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { role: "admin", label: "Admins", color: "bg-destructive" },
                      { role: "moderator", label: "Moderators", color: "bg-amber-500" },
                      { role: "user", label: "Users", color: "bg-primary" },
                    ].map(({ role, label, color }) => {
                      const count = roleCounts[role] || 0;
                      const pct = stats.users.length > 0 ? (count / stats.users.length) * 100 : 0;
                      return (
                        <div key={role}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium text-foreground">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    {bannedCount > 0 && (
                      <div className="sm:col-span-3 flex items-center gap-2 pt-2 border-t border-border">
                        <Ban className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs text-muted-foreground">{bannedCount} banned user{bannedCount !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* User Data Inspection Dialog */}
      <Dialog open={!!inspectUser} onOpenChange={(open) => { if (!open) { setInspectUser(null); setUserDetail(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <span className="block">{inspectUser?.display_name || "User"}'s Data</span>
                <span className="block text-xs font-normal text-muted-foreground">{inspectUser?.email}</span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : userDetail ? (
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Photos", count: userDetail.counts.photos, icon: Image, color: "text-violet-500" },
                  { label: "Notes", count: userDetail.counts.notes, icon: StickyNote, color: "text-amber-500" },
                  { label: "Files", count: userDetail.counts.driveFiles, icon: HardDrive, color: "text-sky-500" },
                  { label: "Contacts", count: userDetail.counts.contacts, icon: Contact, color: "text-pink-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
                    <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                    <p className="text-lg font-bold text-foreground">{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Export button */}
              <Button variant="outline" size="sm" onClick={exportUserDataCSV} className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export User Data CSV
              </Button>

              {/* Tabbed data view */}
              <Tabs defaultValue="photos" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="photos" className="text-xs">Photos</TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">Files</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs">Contacts</TabsTrigger>
                </TabsList>

                <TabsContent value="photos" className="max-h-60 overflow-y-auto">
                  {userDetail.photos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No photos</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Size</TableHead><TableHead className="text-xs">Fav</TableHead><TableHead className="text-xs">Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetail.photos.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs truncate max-w-[200px]">{p.name}</TableCell>
                            <TableCell className="text-xs">{p.size || "-"}</TableCell>
                            <TableCell className="text-xs">{p.favorite ? "⭐" : "-"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="max-h-60 overflow-y-auto">
                  {userDetail.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No notes</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Title</TableHead><TableHead className="text-xs">Folder</TableHead><TableHead className="text-xs">Pinned</TableHead><TableHead className="text-xs">Updated</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetail.notes.map((n: any) => (
                          <TableRow key={n.id}>
                            <TableCell className="text-xs truncate max-w-[200px]">{n.title || "Untitled"}</TableCell>
                            <TableCell className="text-xs">{n.folder || "General"}</TableCell>
                            <TableCell className="text-xs">{n.pinned ? "📌" : "-"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(n.updated_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="files" className="max-h-60 overflow-y-auto">
                  {userDetail.driveFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No drive files</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Folder</TableHead><TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Size</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetail.driveFiles.map((f: any) => (
                          <TableRow key={f.id}>
                            <TableCell className="text-xs truncate max-w-[200px]">{f.name}</TableCell>
                            <TableCell className="text-xs">{f.folder || "/"}</TableCell>
                            <TableCell className="text-xs">{(f.mime_type || "").split("/").pop()}</TableCell>
                            <TableCell className="text-xs">{formatBytes(f.size_bytes || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="contacts" className="max-h-60 overflow-y-auto">
                  {userDetail.contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No contacts</p>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">Email</TableHead><TableHead className="text-xs">Phone</TableHead><TableHead className="text-xs">Company</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetail.contacts.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">{c.first_name} {c.last_name || ""}</TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]">{c.email || "-"}</TableCell>
                            <TableCell className="text-xs">{c.phone || "-"}</TableCell>
                            <TableCell className="text-xs">{c.company || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((d) => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await confirmDialog.action(); setConfirmDialog((d) => ({ ...d, open: false })); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
