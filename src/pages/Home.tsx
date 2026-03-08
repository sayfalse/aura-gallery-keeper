import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ProfileMenu from "@/components/ProfileMenu";
import { Image, StickyNote, HardDrive, Users, Mail, Cloud, Settings } from "lucide-react";

const apps = [
  { id: "gallery", name: "Gallery", icon: Image, color: "from-blue-500 to-cyan-400", path: "/gallery" },
  { id: "notes", name: "Notes", icon: StickyNote, color: "from-amber-400 to-orange-500", path: "/notes" },
  { id: "drive", name: "Drive", icon: HardDrive, color: "from-indigo-500 to-purple-500", path: "/drive" },
  { id: "contacts", name: "Contacts", icon: Users, color: "from-emerald-500 to-teal-500", path: "/contacts" },
  { id: "mail", name: "Mail", icon: Mail, color: "from-sky-500 to-blue-600", path: "/mail" },
  { id: "settings", name: "Settings", icon: Settings, color: "from-gray-500 to-gray-600", path: "/settings" },
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight">PixelVault</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {displayName}</p>
          </div>
        </div>
        <ProfileMenu />
      </header>

      {/* App Grid */}
      <main className="px-6 pt-8 pb-20 max-w-3xl mx-auto">
        <h2 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">Your Apps</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {apps.map((app, i) => (
            <button
              key={app.id}
              onClick={() => navigate(app.path)}
              className="group flex flex-col items-center gap-3 p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <app.icon className="w-8 h-8 text-white" />
              </div>
              <span className="text-sm font-medium text-foreground">{app.name}</span>
            </button>
          ))}
        </div>

        {/* Cloud status */}
        <div className="mt-12 p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-foreground">Cloud Sync Active</span>
          </div>
          <p className="text-xs text-muted-foreground">
            All your data is securely stored in the cloud with at-rest encryption. 
            Your files persist across devices and reinstalls — just sign back in.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Home;
