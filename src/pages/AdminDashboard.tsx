import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Users, Image, StickyNote, HardDrive, MessageCircle,
  UserPlus, Megaphone, Contact, ArrowLeft, Shield,
  TrendingUp, Activity, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

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
  users: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    created_at: string;
  }[];
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

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
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, []);

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

        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
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

          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Recent Users
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
                ) : (
                  stats.users.slice(0, 8).map((profile) => (
                    <div
                      key={profile.user_id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                        {(profile.display_name || "U")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {profile.display_name || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          @{profile.username || "no-username"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {formatDate(profile.created_at)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
