import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProfileMenu from "@/components/ProfileMenu";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion } from "framer-motion";
import {
  Image, StickyNote, HardDrive, Users, Mail, Settings, Sparkles, Globe, MessageCircle,
  ArrowUpRight, Layers
} from "lucide-react";

const apps = [
  { id: "gallery", name: "Gallery", icon: Image, gradient: "from-blue-500 to-cyan-400", path: "/gallery", desc: "Photos & Albums" },
  { id: "notes", name: "Notes", icon: StickyNote, gradient: "from-amber-500 to-orange-400", path: "/notes", desc: "Quick thoughts" },
  { id: "drive", name: "Drive", icon: HardDrive, gradient: "from-indigo-500 to-purple-400", path: "/drive", desc: "Cloud storage" },
  { id: "contacts", name: "People", icon: Users, gradient: "from-emerald-500 to-teal-400", path: "/contacts", desc: "Contacts" },
  { id: "mail", name: "Mail", icon: Mail, gradient: "from-sky-500 to-blue-400", path: "/mail", desc: "Email" },
  { id: "chat", name: "Chat", icon: MessageCircle, gradient: "from-green-500 to-emerald-400", path: "/chat", desc: "Messages" },
  { id: "pixel-ai", name: "Pixel AI", icon: Sparkles, gradient: "from-violet-500 to-fuchsia-400", path: "/pixel-ai", desc: "AI Assistant" },
  { id: "browser", name: "Browser", icon: Globe, gradient: "from-rose-500 to-orange-400", path: "/browser", desc: "Web" },
  { id: "settings", name: "Settings", icon: Settings, gradient: "from-slate-500 to-gray-400", path: "/settings", desc: "Preferences" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.08 * i, duration: 0.4, ease: "easeOut" as const }
  }),
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const [counts, setCounts] = useState({ photos: 0, notes: 0, contacts: 0, files: 0 });

  const loadData = useCallback(async () => {
    if (!user) return;
    const [p, n, c, f] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("deleted", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setCounts({ photos: p.count || 0, notes: n.count || 0, contacts: c.count || 0, files: f.count || 0 });
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
            <Layers className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{greeting()}</p>
            <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
          </div>
        </div>
        <ProfileMenu />
      </header>

      {/* Content */}
      <main className="px-5 pb-28 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Photos", value: counts.photos, icon: Image },
            { label: "Notes", value: counts.notes, icon: StickyNote },
            { label: "People", value: counts.contacts, icon: Users },
            { label: "Files", value: counts.files, icon: HardDrive },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className="p-3 rounded-2xl bg-card border border-border text-center"
            >
              <s.icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Banner */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          onClick={() => navigate("/pixel-ai")}
          className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 p-4 text-left group"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">Ask Pixel AI</h3>
              <p className="text-[11px] text-white/70">Chat, generate, translate</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
          </div>
        </motion.button>

        {/* App Grid */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Apps</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {apps.map((app, i) => (
              <motion.button
                key={app.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(app.path)}
                className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 text-left"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                  <app.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{app.name}</p>
                  <p className="text-[10px] text-muted-foreground">{app.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      <ModuleSwitcher />
    </div>
  );
};

export default Home;
