import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Users, Image, StickyNote, HardDrive, MessageCircle,
  UserPlus, Megaphone, Contact, ArrowLeft, Shield,
  TrendingUp, Activity, Clock, Ban, ShieldCheck, ShieldAlert,
  ChevronDown, UserCog, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => {} });

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

      if (fnError) {
        if (!isRefresh) setError(fnError.message || "Failed to load admin stats");
      } else if (data?.error) {
        if (!isRefresh) setError(data.error);
      } else {
        setStats(data);
        setError(null);
      }
    } catch (e: any) {
      if (!isRefresh) setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const manageUser = useCallback(async (action: string, targetUserId: string, role?: string) => {
    setActionLoading(targetUserId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const { data, error: fnError } = await supabase.functions.invoke("admin-manage-user", {
        headers: { Authorization: `Bearer ${token}` },
        body: { action, targetUserId, role },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Success", description: data?.message || "Action completed" });
      await fetchStats(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  }, [getToken, fetchStats, toast]);

  const confirmAction = (title: string, description: string, action: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const isBanned = (u: UserProfile) => {
    if (!u.banned_until) return false;
    return new Date(u.banned_until) > new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-5 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-48 h-8" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatChartDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-5 pt-[env(safe-area-inset-top)] py-5 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">System overview & analytics</p>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-28 space-y-6 max-w-6xl mx-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
            >
              <Card className="border-border/50 hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center`}>
                      <card.icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {(stats.overview as any)[card.key]?.toLocaleString() ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Signups chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                User Signups (Last 30 Days)
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
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.75rem",
                        fontSize: 12,
                      }}
                      labelFormatter={formatChartDate}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fill="url(#signupGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Management */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
              ) : (
                stats.users.map((profile) => {
                  const banned = isBanned(profile);
                  const isCurrentUser = profile.user_id === user?.id;
                  const isLoading = actionLoading === profile.user_id;

                  return (
                    <div
                      key={profile.user_id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        banned ? "bg-destructive/5 border border-destructive/10" : "bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(profile.display_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground truncate">
                            {profile.display_name || "Unknown"}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 h-4 ${roleBadgeStyles[profile.role] || roleBadgeStyles.user}`}
                          >
                            {profile.role}
                          </Badge>
                          {banned && (
                            <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                              <Ban className="w-2.5 h-2.5 mr-0.5" /> Banned
                            </Badge>
                          )}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">You</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {profile.email || `@${profile.username || "no-username"}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex shrink-0">
                        {formatDate(profile.created_at)}
                      </Badge>

                      {!isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">Change Role</DropdownMenuLabel>
                            {["admin", "moderator", "user"].map((r) => (
                              <DropdownMenuItem
                                key={r}
                                disabled={profile.role === r}
                                onClick={() =>
                                  confirmAction(
                                    `Set role to ${r}?`,
                                    `This will change ${profile.display_name || "this user"}'s role to ${r}.`,
                                    () => manageUser("set_role", profile.user_id, r)
                                  )
                                }
                                className="text-xs"
                              >
                                {r === "admin" && <ShieldAlert className="w-3.5 h-3.5 mr-2 text-destructive" />}
                                {r === "moderator" && <ShieldCheck className="w-3.5 h-3.5 mr-2 text-amber-500" />}
                                {r === "user" && <Users className="w-3.5 h-3.5 mr-2 text-muted-foreground" />}
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                                {profile.role === r && " (current)"}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {banned ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmAction(
                                    "Unban user?",
                                    `This will restore ${profile.display_name || "this user"}'s access.`,
                                    () => manageUser("unban_user", profile.user_id)
                                  )
                                }
                                className="text-xs text-emerald-600"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  confirmAction(
                                    "Ban user?",
                                    `This will permanently block ${profile.display_name || "this user"} from signing in.`,
                                    () => manageUser("ban_user", profile.user_id)
                                  )
                                }
                                className="text-xs text-destructive"
                              >
                                <Ban className="w-3.5 h-3.5 mr-2" />
                                Ban User
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
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  stats.recentActivity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.type === "photo"
                          ? "bg-violet-500/10 text-violet-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {item.type === "photo" ? (
                          <Image className="w-4 h-4" />
                        ) : (
                          <StickyNote className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.type === "photo" ? "Photo uploaded" : "Note created"}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Role Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Role Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const roleCounts = stats.users.reduce<Record<string, number>>((acc, u) => {
                    acc[u.role] = (acc[u.role] || 0) + 1;
                    return acc;
                  }, {});
                  const bannedCount = stats.users.filter(isBanned).length;
                  return (
                    <div className="space-y-3">
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
                              <div
                                className={`h-full rounded-full ${color} transition-all duration-500`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {bannedCount > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <Ban className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-xs text-muted-foreground">
                            {bannedCount} banned user{bannedCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((d) => ({ ...d, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirmDialog.action();
                setConfirmDialog((d) => ({ ...d, open: false }));
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
