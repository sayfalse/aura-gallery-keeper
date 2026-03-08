import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, User, Moon, Sun, Monitor, Shield, HardDrive, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [driveFileCount, setDriveFileCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Load profile
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        else setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      });

    // Load counts
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("deleted", false).then(({ count }) => setPhotoCount(count || 0));
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setNoteCount(count || 0));
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setContactCount(count || 0));
    supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setDriveFileCount(count || 0));
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [user, displayName]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const email = user?.email || "";

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h1 className="font-display text-lg font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        {/* Profile */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </h2>
          <div className="flex items-center gap-4 mb-5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Moon className="w-4 h-4" /> Appearance
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  theme === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <opt.icon className={`w-5 h-5 ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Storage */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Storage & Data
          </h2>
          <div className="space-y-3">
            {[
              { label: "Photos", count: photoCount },
              { label: "Notes", count: noteCount },
              { label: "Contacts", count: contactCount },
              { label: "Drive Files", count: driveFileCount },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground">{item.label}</span>
                <span className="text-sm text-muted-foreground font-medium">{item.count} items</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Cloud Storage</span>
                <span className="text-xs text-muted-foreground">Unlimited</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full w-[8%] rounded-full bg-primary transition-all duration-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">Encryption</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">At-rest AES-256</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-foreground">Auth Provider</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Google OAuth</span>
            </div>
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
      <ModuleSwitcher />
    </div>
  );
};

export default SettingsPage;
