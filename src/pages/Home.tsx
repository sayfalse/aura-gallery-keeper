import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProfileMenu from "@/components/ProfileMenu";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { Image, StickyNote, HardDrive, Users, Mail, Cloud, Settings, Clock, Star, FileText } from "lucide-react";

const apps = [
  { id: "gallery", name: "Gallery", icon: Image, color: "from-blue-500 to-cyan-400", path: "/gallery" },
  { id: "notes", name: "Notes", icon: StickyNote, color: "from-amber-400 to-orange-500", path: "/notes" },
  { id: "drive", name: "Drive", icon: HardDrive, color: "from-indigo-500 to-purple-500", path: "/drive" },
  { id: "contacts", name: "Contacts", icon: Users, color: "from-emerald-500 to-teal-500", path: "/contacts" },
  { id: "mail", name: "Mail", icon: Mail, color: "from-sky-500 to-blue-600", path: "/mail" },
  { id: "settings", name: "Settings", icon: Settings, color: "from-gray-500 to-gray-600", path: "/settings" },
];

interface QuickStat {
  label: string;
  count: number;
  icon: typeof Image;
}

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [recentNotes, setRecentNotes] = useState<{ id: string; title: string; updatedAt: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    // Load stats
    Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("deleted", false),
      supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([photos, notes, contacts, files]) => {
      setStats([
        { label: "Photos", count: photos.count || 0, icon: Image },
        { label: "Notes", count: notes.count || 0, icon: StickyNote },
        { label: "Contacts", count: contacts.count || 0, icon: Users },
        { label: "Files", count: files.count || 0, icon: HardDrive },
      ]);
    });

    // Load recent notes
    supabase
      .from("notes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setRecentNotes((data || []).map((n: any) => ({ id: n.id, title: n.title, updatedAt: n.updated_at })));
      });
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

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
            <p className="text-xs text-muted-foreground">{greeting()}, {displayName}</p>
          </div>
        </div>
        <ProfileMenu />
      </header>

      <main className="px-6 pt-4 pb-20 max-w-3xl mx-auto space-y-8">
        {/* Quick Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-2xl bg-card border border-border">
                <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-primary/70" />
                <p className="text-lg font-bold text-foreground">{stat.count}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* App Grid */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Your Apps</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {apps.map((app, i) => (
              <button
                key={app.id}
                onClick={() => navigate(app.path)}
                className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <app.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{app.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Notes */}
        {recentNotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Recent Notes
              </h2>
              <button onClick={() => navigate("/notes")} className="text-xs text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => navigate("/notes")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent/50 transition-all text-left"
                >
                  <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate flex-1">{note.title || "Untitled"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cloud status */}
        <div className="p-5 rounded-2xl bg-card border border-border">
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
      <ModuleSwitcher />
    </div>
  );
};

export default Home;
