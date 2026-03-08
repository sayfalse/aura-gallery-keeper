import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { LayoutGrid, Image, StickyNote, HardDrive, Users, Mail, Settings, Home, Globe, Sparkles, MessageCircle, Music2, Shield } from "lucide-react";

const modules = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/gallery", icon: Image, label: "Gallery" },
  { path: "/notes", icon: StickyNote, label: "Notes" },
  { path: "/drive", icon: HardDrive, label: "Drive" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/mail", icon: Mail, label: "Mail" },
  { path: "/chat", icon: MessageCircle, label: "Chat" },
  { path: "/pixel-ai", icon: Sparkles, label: "Pixel AI" },
  { path: "/browser", icon: Globe, label: "Browser" },
  { path: "/vault", icon: Shield, label: "Vault" },
  { path: "/music", icon: Music2, label: "Music" },
  { path: "/vpn", icon: Shield, label: "VPN & DNS" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

const QuickNavButton = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        title="Quick navigation"
      >
        <LayoutGrid className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden animate-slide-up">
          {modules.map((mod) => {
            const isActive = pathname === mod.path;
            return (
              <button
                key={mod.path}
                onClick={() => { navigate(mod.path); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-accent/50"
                }`}
              >
                <mod.icon className="w-4 h-4" />
                {mod.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickNavButton;
