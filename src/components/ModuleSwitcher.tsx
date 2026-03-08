import { useNavigate, useLocation } from "react-router-dom";
import { Image, StickyNote, HardDrive, Users, Mail, Settings, Home, Sparkles, Globe } from "lucide-react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { useCallback } from "react";

const modules = [
  { path: "/", icon: Home, label: "Home", color: "text-blue-500", activeBg: "bg-blue-500/10" },
  { path: "/gallery", icon: Image, label: "Gallery", color: "text-cyan-500", activeBg: "bg-cyan-500/10" },
  { path: "/notes", icon: StickyNote, label: "Notes", color: "text-amber-500", activeBg: "bg-amber-500/10" },
  { path: "/drive", icon: HardDrive, label: "Drive", color: "text-indigo-500", activeBg: "bg-indigo-500/10" },
  { path: "/contacts", icon: Users, label: "Contacts", color: "text-emerald-500", activeBg: "bg-emerald-500/10" },
  { path: "/mail", icon: Mail, label: "Mail", color: "text-sky-500", activeBg: "bg-sky-500/10" },
  { path: "/pixel-ai", icon: Sparkles, label: "Pixel", color: "text-violet-500", activeBg: "bg-violet-500/10" },
  { path: "/browser", icon: Globe, label: "Browser", color: "text-rose-500", activeBg: "bg-rose-500/10" },
  { path: "/settings", icon: Settings, label: "Settings", color: "text-slate-500", activeBg: "bg-slate-500/10" },
];

const ModuleSwitcher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const currentIndex = modules.findIndex(
    (mod) => pathname === mod.path || (mod.path !== "/" && pathname.startsWith(mod.path))
  );

  const handleSwipe = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      const velocity = 300;

      if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > velocity) {
        if (info.offset.x < 0 && currentIndex < modules.length - 1) {
          // Swipe left → next module
          navigate(modules[currentIndex + 1].path);
        } else if (info.offset.x > 0 && currentIndex > 0) {
          // Swipe right → previous module
          navigate(modules[currentIndex - 1].path);
        }
      }
    },
    [currentIndex, navigate]
  );

  return (
    <>
      {/* Invisible swipe zone at the bottom of the screen */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 h-24 z-20 md:hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipe}
        style={{ touchAction: "pan-y" }}
      />

      {/* Navigation bar */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 px-2 py-1.5 rounded-2xl bg-card/85 backdrop-blur-2xl border border-border/60 shadow-xl shadow-black/5"
      >
        {modules.map((mod) => {
          const isActive = pathname === mod.path || (mod.path !== "/" && pathname.startsWith(mod.path));
          return (
            <motion.button
              key={mod.path}
              onClick={() => navigate(mod.path)}
              whileTap={{ scale: 0.9 }}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? `${mod.activeBg} ${mod.color}`
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
              title={mod.label}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className={`absolute inset-0 ${mod.activeBg} rounded-xl`}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <mod.icon className={`relative z-10 w-4 h-4 ${isActive ? mod.color : ""}`} />
              <span className={`relative z-10 text-[9px] font-medium leading-none ${isActive ? mod.color : ""}`}>{mod.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </>
  );
};

export default ModuleSwitcher;
