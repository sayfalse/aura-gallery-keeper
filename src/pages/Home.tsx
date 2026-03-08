import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWallpaper } from "@/contexts/WallpaperContext";
import ProfileMenu from "@/components/ProfileMenu";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import PullToRefresh from "@/components/PullToRefresh";
import { motion } from "framer-motion";
import {
  Image, StickyNote, HardDrive, Users, Mail, Settings, Sparkles, MessageCircle,
  ArrowUpRight, Layers, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const appKeys = [
  { id: "gallery", nameKey: "apps.gallery", icon: Image, gradient: "from-blue-500 to-cyan-400", path: "/gallery", descKey: "apps.galleryDesc" },
  { id: "notes", nameKey: "apps.notes", icon: StickyNote, gradient: "from-amber-400 to-orange-500", path: "/notes", descKey: "apps.notesDesc" },
  { id: "drive", nameKey: "apps.drive", icon: HardDrive, gradient: "from-sky-400 to-blue-600", path: "/drive", descKey: "apps.driveDesc" },
  { id: "contacts", nameKey: "apps.people", icon: Users, gradient: "from-emerald-400 to-teal-500", path: "/contacts", descKey: "apps.peopleDesc" },
  { id: "mail", nameKey: "apps.mail", icon: Mail, gradient: "from-indigo-400 to-blue-500", path: "/mail", descKey: "apps.mailDesc" },
  { id: "chat", nameKey: "apps.chat", icon: MessageCircle, gradient: "from-cyan-400 to-sky-500", path: "/chat", descKey: "apps.chatDesc" },
  { id: "pixel-ai", nameKey: "apps.pixelAI", icon: Sparkles, gradient: "from-blue-600 to-indigo-500", path: "/pixel-ai", descKey: "apps.pixelAIDesc" },
  { id: "settings", nameKey: "apps.settings", icon: Settings, gradient: "from-slate-400 to-zinc-500", path: "/settings", descKey: "apps.settingsDesc" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 * i, duration: 0.4, ease: "easeOut" as const }
  }),
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { wallpaperUrl, wallpaperOpacity, wallpaperBlur } = useWallpaper();
  const [isAdmin, setIsAdmin] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  const checkAdmin = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (data) setIsAdmin(true);
  }, [user]);

  useEffect(() => { checkAdmin(); }, [checkAdmin]);

  const handleRefresh = useCallback(async () => {
    await checkAdmin();
    await new Promise((r) => setTimeout(r, 300));
  }, [checkAdmin]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return t("home.greeting.night");
    if (h < 12) return t("home.greeting.morning");
    if (h < 18) return t("home.greeting.afternoon");
    if (h < 21) return t("home.greeting.evening");
    return t("home.greeting.night");
  };

  const hasWallpaper = !!wallpaperUrl;

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen relative">
      {/* Home-specific wallpaper layer (like Android home screen) */}
      {hasWallpaper && (
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `url(${wallpaperUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: Math.min(wallpaperOpacity * 3, 0.9), // stronger on home screen
            filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
          }}
        />
      )}
      {/* Semi-transparent overlay so text stays readable */}
      {hasWallpaper && (
        <div className="fixed inset-0 z-0 bg-background/60" />
      )}

      <div className={`relative ${hasWallpaper ? "z-[1]" : ""}`}>
        <header className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top)] py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/25">
              <Layers className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{greeting()}</p>
              <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
            </div>
          </div>
          <ProfileMenu />
        </header>

        <main className="px-5 pb-28 space-y-6">
          {/* AI CTA */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            onClick={() => navigate("/pixel-ai")}
            className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 p-4 text-left group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-6" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">{t("home.askPixelAI")}</h3>
                <p className="text-[11px] text-white/70">{t("home.aiDesc")}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
            </div>
          </motion.button>

          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card/80 backdrop-blur-sm border border-destructive/20 hover:border-destructive/40 hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">Admin Dashboard</p>
                <p className="text-[10px] text-muted-foreground">System stats & user management</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          )}

          {/* App grid */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("home.apps")}</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {appKeys.map((app, i) => (
                <motion.button
                  key={app.id}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(app.path)}
                  className={`group flex items-center gap-3 p-3.5 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left ${
                    hasWallpaper ? "bg-card/70 backdrop-blur-md" : "bg-card"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                    <app.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">{t(app.nameKey)}</p>
                    <p className="text-[10px] text-muted-foreground">{t(app.descKey)}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </main>

        <ModuleSwitcher />
      </div>
    </PullToRefresh>
  );
};

export default Home;
