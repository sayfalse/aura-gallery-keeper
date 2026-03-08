import { useNavigate, useLocation } from "react-router-dom";
import { Image, StickyNote, HardDrive, Users, Mail, Settings, Home, Sparkles } from "lucide-react";

const modules = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/gallery", icon: Image, label: "Gallery" },
  { path: "/notes", icon: StickyNote, label: "Notes" },
  { path: "/drive", icon: HardDrive, label: "Drive" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/mail", icon: Mail, label: "Mail" },
  { path: "/pixel-ai", icon: Sparkles, label: "Pixel AI" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const ModuleSwitcher = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border shadow-lg">
      {modules.map((mod) => {
        const isActive = pathname === mod.path || (mod.path !== "/" && pathname.startsWith(mod.path));
        return (
          <button
            key={mod.path}
            onClick={() => navigate(mod.path)}
            className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
            title={mod.label}
          >
            <mod.icon className="w-4 h-4" />
            <span className="text-[9px] font-medium leading-none">{mod.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModuleSwitcher;
