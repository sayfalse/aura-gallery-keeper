import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Image, Settings, Home, Mail, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const modules = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/gallery", icon: Image, labelKey: "nav.gallery" },
  { path: "/mail", icon: Mail, labelKey: "nav.mail" },
  { path: "/chat", icon: MessageCircle, labelKey: "nav.chat" },
  { path: "/settings", icon: Settings, labelKey: "nav.settings" },
];

const ModuleSwitcher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
      className="fixed bottom-0 left-0 right-0 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto max-w-lg px-2 pb-2">
        <div className="flex items-center justify-between px-1 py-1.5 rounded-2xl bg-card/90 backdrop-blur-2xl border border-border/50 shadow-lg shadow-black/5">
          {modules.map((mod) => {
            const isActive = pathname === mod.path || (mod.path !== "/" && pathname.startsWith(mod.path));
            return (
              <motion.button
                key={mod.path}
                onClick={() => navigate(mod.path)}
                whileTap={{ scale: 0.85 }}
                className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all duration-200 min-w-0 flex-1 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <mod.icon className={`relative z-10 w-[18px] h-[18px] ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                <span className={`relative z-10 text-[9px] leading-none font-medium ${isActive ? "font-semibold" : ""}`}>
                  {t(mod.labelKey)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
};

export default ModuleSwitcher;
