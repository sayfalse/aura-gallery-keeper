import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProfileMenu from "@/components/ProfileMenu";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, useScroll, useTransform, useMotionValue, useAnimation } from "framer-motion";
import {
  Image, StickyNote, HardDrive, Users, Mail, Settings, Clock, FileText, Sparkles,
  Shield, ArrowUpRight, TrendingUp, Layers, RefreshCw
} from "lucide-react";

const apps = [
  { id: "gallery", name: "Gallery", icon: Image, gradient: "from-blue-500 via-blue-400 to-cyan-400", shadow: "shadow-blue-500/25", desc: "Photos & Albums", path: "/gallery" },
  { id: "notes", name: "Notes", icon: StickyNote, gradient: "from-amber-500 via-orange-400 to-yellow-400", shadow: "shadow-amber-500/25", desc: "Quick thoughts", path: "/notes" },
  { id: "drive", name: "Drive", icon: HardDrive, gradient: "from-indigo-600 via-indigo-500 to-purple-400", shadow: "shadow-indigo-500/25", desc: "File storage", path: "/drive" },
  { id: "contacts", name: "Contacts", icon: Users, gradient: "from-emerald-500 via-emerald-400 to-teal-400", shadow: "shadow-emerald-500/25", desc: "People", path: "/contacts" },
  { id: "mail", name: "Mail", icon: Mail, gradient: "from-sky-500 via-sky-400 to-blue-400", shadow: "shadow-sky-500/25", desc: "Email", path: "/mail" },
  { id: "pixel-ai", name: "Pixel AI", icon: Sparkles, gradient: "from-violet-600 via-fuchsia-500 to-pink-400", shadow: "shadow-violet-500/25", desc: "AI Assistant", path: "/pixel-ai" },
  { id: "settings", name: "Settings", icon: Settings, gradient: "from-slate-500 via-slate-400 to-gray-400", shadow: "shadow-slate-500/25", desc: "Preferences", path: "/settings" },
];

const statConfig = [
  { key: "Photos", gradient: "from-blue-500 to-cyan-400", icon: Image },
  { key: "Notes", gradient: "from-amber-500 to-orange-400", icon: StickyNote },
  { key: "Contacts", gradient: "from-emerald-500 to-teal-400", icon: Users },
  { key: "Files", gradient: "from-indigo-500 to-purple-400", icon: HardDrive },
];

interface QuickStat { label: string; count: number; icon: typeof Image; }

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } } };

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [recentNotes, setRecentNotes] = useState<{ id: string; title: string; updatedAt: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, 80], [0, 1]);
  const pullRotate = useTransform(pullY, [0, 80], [0, 360]);
  const pullOpacity = useTransform(pullY, [0, 30, 80], [0, 0.6, 1]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const headerY = useTransform(scrollY, [0, 120], [0, -30]);
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.85]);
  const headerScale = useTransform(scrollY, [0, 120], [1, 0.97]);
  const blobX1 = useTransform(scrollY, [0, 300], [0, 40]);
  const blobY1 = useTransform(scrollY, [0, 300], [0, -60]);
  const blobX2 = useTransform(scrollY, [0, 300], [0, -30]);
  const blobY2 = useTransform(scrollY, [0, 300], [0, 40]);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [photos, notes, contacts, files] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("deleted", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setStats([
      { label: "Photos", count: photos.count || 0, icon: Image },
      { label: "Notes", count: notes.count || 0, icon: StickyNote },
      { label: "Contacts", count: contacts.count || 0, icon: Users },
      { label: "Files", count: files.count || 0, icon: HardDrive },
    ]);
    const { data } = await supabase.from("notes").select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(3);
    setRecentNotes((data || []).map((n: any) => ({ id: n.id, title: n.title, updatedAt: n.updated_at })));
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePullRelease = useCallback(async () => {
    if (pullY.get() > 60) {
      setRefreshing(true);
      await loadData();
      setRefreshing(false);
    }
    pullY.set(0);
  }, [loadData, pullY]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div ref={scrollRef} className="min-h-screen bg-background overflow-y-auto">
      {/* Parallax decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div style={{ x: blobX1, y: blobY1 }} className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <motion.div style={{ x: blobX2, y: blobY2 }} className="absolute top-1/3 -left-20 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Parallax Header */}
      <motion.header
        style={{ y: headerY, opacity: headerOpacity, scale: headerScale }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-5 bg-background/70 backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Layers className="w-5 h-5 text-primary-foreground" />
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">PixelVault</h1>
            <p className="text-xs text-muted-foreground">{greeting()}, <span className="text-foreground font-medium">{displayName}</span></p>
          </div>
        </div>
        <ProfileMenu />
      </motion.header>

      {/* Pull-to-refresh indicator */}
      <motion.div
        style={{ opacity: pullOpacity, y: pullY }}
        className="flex justify-center py-2 -mt-2"
      >
        <motion.div
          style={{ rotate: refreshing ? undefined : pullRotate }}
          animate={refreshing ? { rotate: 360 } : {}}
          transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : {}}
          className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? "" : ""}`} />
        </motion.div>
      </motion.div>

      <motion.main
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        style={{ y: pullY }}
        onDragEnd={handlePullRelease}
        className="relative px-5 pt-2 pb-28 max-w-3xl mx-auto space-y-7 cursor-grab active:cursor-grabbing"
      >
        {/* Stats */}
        {stats.length > 0 && (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-4 gap-2.5">
            {stats.map((stat, i) => {
              const cfg = statConfig[i];
              return (
                <motion.div key={stat.label} variants={scaleIn}
                  className="relative overflow-hidden p-3 rounded-2xl bg-card border border-border group hover:border-primary/20 transition-all duration-300"
                >
                  <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-br ${cfg.gradient} opacity-[0.08] rounded-full -translate-y-2 translate-x-2 group-hover:opacity-[0.15] transition-opacity`} />
                  <cfg.icon className="w-4 h-4 text-muted-foreground mb-2" />
                  <p className="text-xl font-bold text-foreground leading-none">{stat.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pixel AI Banner */}
        <motion.button
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={() => navigate("/pixel-ai")}
          className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 p-5 text-left group hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/90 via-fuchsia-500/90 to-pink-500/90" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-10 -translate-x-5" />
          <div className="relative flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-base font-bold text-white">Ask Pixel AI</h3>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white/90 font-medium">NEW</span>
              </div>
              <p className="text-xs text-white/70">Chat, generate images, translate — in any language</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </motion.button>

        {/* App Grid */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Your Apps</h2>
            <span className="text-[10px] text-muted-foreground">{apps.length} apps</span>
          </div>
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {apps.map((app) => (
              <motion.button
                key={app.id}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(app.path)}
                className="group relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300"
              >
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${app.gradient} opacity-[0.06] rounded-full -translate-y-6 translate-x-6 group-hover:opacity-[0.12] group-hover:scale-150 transition-all duration-500`} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md ${app.shadow} group-hover:scale-105 group-hover:shadow-lg transition-all duration-300`}>
                  <app.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground block">{app.name}</span>
                  <span className="text-[10px] text-muted-foreground">{app.desc}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Recent Notes */}
        {recentNotes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Recent Activity
              </h2>
              <button onClick={() => navigate("/notes")} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentNotes.map((note, i) => (
                <motion.button
                  key={note.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
                  onClick={() => navigate("/notes")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">{note.title || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cloud & Security */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">Cloud Sync</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Data syncs across all your devices in real-time.</p>
          </div>
          <div className="relative overflow-hidden p-4 rounded-2xl bg-card border border-border">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -translate-y-4 translate-x-4" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground block">Encrypted</span>
                <span className="text-[10px] text-muted-foreground">AES-256 • TLS 1.3</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Military-grade encryption protects your data.</p>
          </div>
        </motion.div>
      </motion.main>
      <ModuleSwitcher />
    </div>
  );
};

export default Home;
