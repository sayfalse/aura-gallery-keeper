import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Settings, User, Moon, Sun, Monitor, Shield, HardDrive, LogOut, ChevronRight, Lock, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";
import {
  getAppLockSettings,
  setAppLockEnabled,
  setAppLockTimeout,
  setAppLockPin,
  removeAppLock,
} from "@/components/AppLockScreen";

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

  // App lock state
  const [lockEnabled, setLockEnabled] = useState(() => getAppLockSettings().enabled);
  const [lockTimeout, setLockTimeout] = useState(() => getAppLockSettings().timeout);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");

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
        <QuickNavButton />
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

        {/* App Lock */}
        <section className="rounded-2xl bg-card border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" /> App Lock
          </h2>

          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Enable App Lock</p>
                <p className="text-xs text-muted-foreground">Require PIN to open app</p>
              </div>
              <button
                onClick={() => {
                  if (!lockEnabled && !getAppLockSettings().hasPin) {
                    setShowPinSetup(true);
                    setPinStep("enter");
                    setNewPin("");
                    setConfirmPin("");
                  } else if (lockEnabled) {
                    setLockEnabled(false);
                    setAppLockEnabled(false);
                    removeAppLock();
                    toast.success("App lock disabled");
                  } else {
                    setLockEnabled(true);
                    setAppLockEnabled(true);
                    toast.success("App lock enabled");
                  }
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  lockEnabled ? "bg-primary" : "bg-border"
                }`}
              >
                <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  lockEnabled ? "translate-x-5" : "translate-x-0.5"
                }`} />
              </button>
            </div>

            {/* PIN Setup Modal */}
            {showPinSetup && (
              <div className="rounded-xl bg-secondary p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {pinStep === "enter" ? "Set a 4-digit PIN" : "Confirm your PIN"}
                </p>
                <div className="flex gap-3 justify-center">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const val = pinStep === "enter" ? newPin : confirmPin;
                    return (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all ${
                          i < val.length ? "bg-primary" : "bg-border"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
                  {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) =>
                    d === "" ? <div key={i} /> : (
                      <button
                        key={i}
                        onClick={() => {
                          if (d === "⌫") {
                            if (pinStep === "enter") setNewPin((p) => p.slice(0, -1));
                            else setConfirmPin((p) => p.slice(0, -1));
                            return;
                          }
                          if (pinStep === "enter") {
                            const next = newPin + d;
                            if (next.length <= 4) setNewPin(next);
                            if (next.length === 4) {
                              setTimeout(() => setPinStep("confirm"), 200);
                            }
                          } else {
                            const next = confirmPin + d;
                            if (next.length <= 4) setConfirmPin(next);
                            if (next.length === 4) {
                              if (next === newPin) {
                                setAppLockPin(next);
                                setAppLockEnabled(true);
                                setLockEnabled(true);
                                setShowPinSetup(false);
                                toast.success("App lock PIN set!");
                              } else {
                                toast.error("PINs don't match, try again");
                                setConfirmPin("");
                                setPinStep("enter");
                                setNewPin("");
                              }
                            }
                          }
                        }}
                        className="h-10 rounded-xl bg-card hover:bg-accent text-sm font-semibold text-foreground transition-colors"
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => setShowPinSetup(false)}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Lock timeout */}
            {lockEnabled && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Lock after</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Immediately", value: 0 },
                    { label: "1 minute", value: 60 },
                    { label: "5 minutes", value: 300 },
                    { label: "20 minutes", value: 1200 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLockTimeout(opt.value);
                        setAppLockTimeout(opt.value);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border-2 ${
                        lockTimeout === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Change PIN */}
            {lockEnabled && (
              <button
                onClick={() => {
                  setShowPinSetup(true);
                  setPinStep("enter");
                  setNewPin("");
                  setConfirmPin("");
                }}
                className="text-sm text-primary font-medium hover:underline"
              >
                Change PIN
              </button>
            )}
          </div>
        </section>


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
