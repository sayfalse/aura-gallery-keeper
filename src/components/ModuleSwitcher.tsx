import { useNavigate, useLocation } from "react-router-dom";
import { Image, StickyNote, HardDrive, Users, Mail, Settings, Home, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const modules = [
  { path: "/", icon: Home, label: "Home", color: "text-blue-500", activeBg: "bg-blue-500/10" },
  { path: "/gallery", icon: Image, label: "Gallery", color: "text-cyan-500", activeBg: "bg-cyan-500/10" },
  { path: "/notes", icon: StickyNote, label: "Notes", color: "text-amber-500", activeBg: "bg-amber-500/10" },
  { path: "/drive", icon: HardDrive, label: "Drive", color: "text-indigo-500", activeBg: "bg-indigo-500/10" },
  { path: "/contacts", icon: Users, label: "Contacts", color: "text-emerald-500", activeBg: "bg-emerald-500/10" },
  { path: "/mail", icon: Mail, label: "Mail", color: "text-sky-500", activeBg: "bg-sky-500/10" },
  { path: "/pixel-ai", icon: Sparkles, label: "Pixel", color: "text-violet-500", activeBg: "bg-violet-500/10" },
  { path: "/settings", icon: Settings, label: "Settings", color: "text-slate-500", activeBg: "bg-slate-500/10" },
];

const ModuleSwitcher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
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
  );
};

export default ModuleSwitcher;
