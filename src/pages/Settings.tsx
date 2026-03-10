import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Settings, User, Moon, Sun, Monitor, Shield, HardDrive, LogOut, Lock, Globe, Search,
  ShieldCheck, Database, Wifi, Code, Mail, ChevronRight, ChevronDown, Github, Send, BarChart3,
  Megaphone, Sparkles, Wrench, Bell, ExternalLink, ImageIcon, Palette, Info
} from "lucide-react";
import PersonalInfoSection from "@/components/settings/PersonalInfoSection";
import TwoFactorSection from "@/components/settings/TwoFactorSection";
import DeleteAccountSection from "@/components/settings/DeleteAccountSection";
import SharingSection from "@/components/settings/SharingSection";
import { toast } from "sonner";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { getStorageAnalytics, formatFileSize } from "@/lib/driveService";
import QuickNavButton from "@/components/QuickNavButton";
import WallpaperSettings from "@/components/WallpaperSettings";
import {
  getAppLockSettings,
  setAppLockEnabled,
  setAppLockTimeout,
  setAppLockPin,
  removeAppLock,
} from "@/components/AppLockScreen";

const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "it", name: "Italian", native: "Italiano" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ko", name: "Korean", native: "한국어" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "ur", name: "Urdu", native: "اردو" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "th", name: "Thai", native: "ไทย" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", native: "Filipino" },
  { code: "tr", name: "Turkish", native: "Türkçe" },
  { code: "pl", name: "Polish", native: "Polski" },
  { code: "nl", name: "Dutch", native: "Nederlands" },
  { code: "sv", name: "Swedish", native: "Svenska" },
  { code: "da", name: "Danish", native: "Dansk" },
  { code: "no", name: "Norwegian", native: "Norsk" },
  { code: "fi", name: "Finnish", native: "Suomi" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "cs", name: "Czech", native: "Čeština" },
  { code: "sk", name: "Slovak", native: "Slovenčina" },
  { code: "ro", name: "Romanian", native: "Română" },
  { code: "hu", name: "Hungarian", native: "Magyar" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "hr", name: "Croatian", native: "Hrvatski" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ha", name: "Hausa", native: "Hausa" },
  { code: "yo", name: "Yoruba", native: "Yorùbá" },
  { code: "ig", name: "Igbo", native: "Igbo" },
  { code: "zu", name: "Zulu", native: "isiZulu" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "si", name: "Sinhala", native: "සිංහල" },
  { code: "my", name: "Burmese", native: "မြန်မာ" },
  { code: "km", name: "Khmer", native: "ខ្មែរ" },
  { code: "lo", name: "Lao", native: "ລາວ" },
  { code: "ka", name: "Georgian", native: "ქართული" },
  { code: "hy", name: "Armenian", native: "Հայերեն" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycan" },
  { code: "kk", name: "Kazakh", native: "Қазақ" },
  { code: "uz", name: "Uzbek", native: "Oʻzbek" },
  { code: "mn", name: "Mongolian", native: "Монгол" },
  { code: "et", name: "Estonian", native: "Eesti" },
  { code: "lv", name: "Latvian", native: "Latviešu" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių" },
  { code: "sq", name: "Albanian", native: "Shqip" },
  { code: "mk", name: "Macedonian", native: "Македонски" },
  { code: "bs", name: "Bosnian", native: "Bosanski" },
  { code: "sl", name: "Slovenian", native: "Slovenščina" },
  { code: "is", name: "Icelandic", native: "Íslenska" },
  { code: "ga", name: "Irish", native: "Gaeilge" },
  { code: "cy", name: "Welsh", native: "Cymraeg" },
  { code: "mt", name: "Maltese", native: "Malti" },
  { code: "eu", name: "Basque", native: "Euskara" },
  { code: "ca", name: "Catalan", native: "Català" },
  { code: "gl", name: "Galician", native: "Galego" },
  { code: "af", name: "Afrikaans", native: "Afrikaans" },
  { code: "xh", name: "Xhosa", native: "isiXhosa" },
];

const LANG_STORAGE_KEY = "app_language";

export const getAppLanguage = () => localStorage.getItem(LANG_STORAGE_KEY) || "en";

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ── Collapsible Category ── */
const SettingsCategory = ({
  icon: Icon,
  label,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-5">{children}</div>}
    </div>
  );
};

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);
  const [driveFileCount, setDriveFileCount] = useState(0);
  const [storageAnalytics, setStorageAnalytics] = useState<{totalSize: number; byType: Record<string, number>; largest: {name: string; size: number}[]; fileCount: number} | null>(null);
  const [lockEnabled, setLockEnabled] = useState(() => getAppLockSettings().enabled);
  const [lockTimeout, setLockTimeoutState] = useState(() => getAppLockSettings().timeout);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [selectedLang, setSelectedLang] = useState(() => getAppLanguage());
  const [langSearch, setLangSearch] = useState("");
  const [showAllLangs, setShowAllLangs] = useState(false);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string; telegram_message_id: number | null; title: string | null;
    content: string; author: string; type: string; created_at: string;
  }>>([]);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        else setDisplayName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      });
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("deleted", false).then(({ count }) => setPhotoCount(count || 0));
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setNoteCount(count || 0));
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setContactCount(count || 0));
    supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("user_id", user.id).then(({ count }) => setDriveFileCount(count || 0));
    getStorageAnalytics(user.id).then(setStorageAnalytics).catch(() => {});
  }, [user]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20);
      if (data) setAnnouncements(data as typeof announcements);
    };
    fetchAnnouncements();
    const channel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const newAnn = payload.new as typeof announcements[0];
        setAnnouncements((prev) => [newAnn, ...prev]);
        toast.info(`📢 ${newAnn.title || "New announcement"}`, { description: newAnn.content.substring(0, 80) });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "announcements" }, (payload) => {
        const updated = payload.new as typeof announcements[0];
        setAnnouncements((prev) => prev.map((a) => a.id === updated.id ? updated : a));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, (payload) => {
        const deleted = payload.old as { id: string };
        setAnnouncements((prev) => prev.filter((a) => a.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
      if (error) throw error;
      toast.success("Profile updated!");
    } catch { toast.error("Failed to save profile"); }
    finally { setSaving(false); }
  }, [user, displayName]);

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const handleLanguageChange = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem(LANG_STORAGE_KEY, code);
    document.documentElement.lang = code;
    const rtlLangs = ["ar", "he", "ur", "fa"];
    document.documentElement.dir = rtlLangs.includes(code) ? "rtl" : "ltr";
    i18n.changeLanguage(code);
    const lang = LANGUAGES.find((l) => l.code === code);
    toast.success(`Language set to ${lang?.name || code}`);
  };

  const themeOptions = [
    { value: "light", label: t("settings.light"), icon: Sun },
    { value: "dark", label: t("settings.dark"), icon: Moon },
    { value: "system", label: t("settings.system"), icon: Monitor },
  ];

  const filteredLangs = LANGUAGES.filter(
    (l) => l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.native.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );
  const displayedLangs = showAllLangs ? filteredLangs : filteredLangs.slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h1 className="font-display text-lg font-bold text-foreground">{t("settings.title")}</h1>
        </div>
        <QuickNavButton />
      </header>

      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-3 pb-36">

        {/* ═══════ ACCOUNT ═══════ */}
        <SettingsCategory icon={User} label="Account" defaultOpen>
          {user && (
            <PersonalInfoSection
              user={user}
              displayName={displayName}
              setDisplayName={setDisplayName}
              onSaveProfile={handleSaveProfile}
              saving={saving}
            />
          )}
          {user && <SharingSection user={user} />}
        </SettingsCategory>

        {/* ═══════ CUSTOMIZATION ═══════ */}
        <SettingsCategory icon={Palette} label="Customization" defaultOpen>
          {/* Theme */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Moon className="w-3.5 h-3.5" /> {t("settings.appearance")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    theme === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <opt.icon className={`w-5 h-5 ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-medium ${theme === opt.value ? "text-primary" : "text-muted-foreground"}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallpaper */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" /> Wallpaper
            </h3>
            <WallpaperSettings />
          </div>

          {/* Language */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" /> {t("settings.language")}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {t("settings.currentLang")}: <span className="text-foreground font-medium">{LANGUAGES.find((l) => l.code === selectedLang)?.name || "English"}</span>
            </p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder={t("settings.searchLanguages")}
                value={langSearch}
                onChange={(e) => { setLangSearch(e.target.value); setShowAllLangs(true); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {displayedLangs.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                    selectedLang === lang.code ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <span className={`text-sm font-medium ${selectedLang === lang.code ? "text-primary" : "text-foreground"}`}>{lang.native}</span>
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                </button>
              ))}
            </div>
            {!showAllLangs && filteredLangs.length > 8 && (
              <button onClick={() => setShowAllLangs(true)} className="w-full mt-3 py-2 text-sm text-primary font-medium hover:underline">
                {t("settings.showAll", { count: filteredLangs.length })}
              </button>
            )}
            {filteredLangs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("settings.noLanguagesFound")}</p>
            )}
          </div>
        </SettingsCategory>

        {/* ═══════ SECURITY & PRIVACY ═══════ */}
        <SettingsCategory icon={Shield} label="Security & Privacy">
          {/* Encryption info */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("settings.dataProtected")}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("settings.dataProtectedDesc")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Database className="w-3.5 h-3.5 text-primary" />At-rest Encryption</span>
              <span className="text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full font-semibold">AES-256</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Wifi className="w-3.5 h-3.5 text-primary" />In-transit Encryption</span>
              <span className="text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full font-semibold">TLS 1.3</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Shield className="w-3.5 h-3.5 text-primary" />Data Isolation</span>
              <span className="text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full font-semibold">Row-Level Security</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Lock className="w-3.5 h-3.5 text-primary" />Auth Provider</span>
              <span className="text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full font-semibold">Google OAuth 2.0</span>
            </div>
            <TwoFactorSection />
          </div>

          {/* App Lock */}
          <div className="pt-2 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> {t("settings.appLock")}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">{t("settings.enableAppLock")}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.requirePin")}</p>
                </div>
                <button
                  onClick={() => {
                    if (!lockEnabled && !getAppLockSettings().hasPin) {
                      setShowPinSetup(true); setPinStep("enter"); setNewPin(""); setConfirmPin("");
                    } else if (lockEnabled) {
                      setLockEnabled(false); setAppLockEnabled(false); removeAppLock(); toast.success("App lock disabled");
                    } else {
                      setLockEnabled(true); setAppLockEnabled(true); toast.success("App lock enabled");
                    }
                  }}
                  className={`w-12 h-7 rounded-full transition-colors relative ${lockEnabled ? "bg-primary" : "bg-border"}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${lockEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {showPinSetup && (
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {pinStep === "enter" ? "Set a 4-digit PIN" : "Confirm your PIN"}
                  </p>
                  <div className="flex gap-3 justify-center">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const val = pinStep === "enter" ? newPin : confirmPin;
                      return <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < val.length ? "bg-primary" : "bg-border"}`} />;
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
                              if (next.length === 4) setTimeout(() => setPinStep("confirm"), 200);
                            } else {
                              const next = confirmPin + d;
                              if (next.length <= 4) setConfirmPin(next);
                              if (next.length === 4) {
                                if (next === newPin) {
                                  setAppLockPin(next).then(() => {
                                    setAppLockEnabled(true); setLockEnabled(true); setShowPinSetup(false);
                                    toast.success("App lock PIN set!");
                                  });
                                } else {
                                  toast.error("PINs don't match, try again"); setConfirmPin(""); setPinStep("enter"); setNewPin("");
                                }
                              }
                            }
                          }}
                          className="h-10 rounded-xl bg-card hover:bg-accent text-sm font-semibold text-foreground transition-colors"
                        >{d}</button>
                      )
                    )}
                  </div>
                  <button onClick={() => setShowPinSetup(false)} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">Cancel</button>
                </div>
              )}

              {lockEnabled && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t("settings.lockAfter")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t("settings.immediately"), value: 0 },
                      { label: t("settings.oneMinute"), value: 60 },
                      { label: t("settings.fiveMinutes"), value: 300 },
                      { label: t("settings.twentyMinutes"), value: 1200 },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setLockTimeoutState(opt.value); setAppLockTimeout(opt.value); }}
                        className={`py-2 px-3 rounded-xl text-xs font-medium transition-all border-2 ${
                          lockTimeout === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                        }`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {lockEnabled && (
                <button
                  onClick={() => { setShowPinSetup(true); setPinStep("enter"); setNewPin(""); setConfirmPin(""); }}
                  className="text-sm text-primary font-medium hover:underline"
                >{t("settings.changePin")}</button>
              )}
            </div>
          </div>
        </SettingsCategory>

        {/* ═══════ STORAGE ═══════ */}
        <SettingsCategory icon={HardDrive} label="Storage & Data">
          <div className="space-y-3">
            {[
              { label: "Photos", count: photoCount },
              { label: "Notes", count: noteCount },
              { label: "Contacts", count: contactCount },
              { label: "Drive Files", count: driveFileCount },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-sm text-primary font-semibold">{item.count} items</span>
              </div>
            ))}

            {(() => {
              const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024;
              const used = storageAnalytics?.totalSize || 0;
              const pct = Math.max(1, Math.min(100, (used / STORAGE_LIMIT) * 100));
              const isNearLimit = pct > 80;
              const isOverLimit = pct >= 100;
              return (
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Cloud Storage</span>
                    <span className={`text-xs font-medium ${isOverLimit ? "text-destructive" : isNearLimit ? "text-yellow-500" : "text-foreground"}`}>
                      {storageAnalytics ? formatFileSize(used) : "—"} / 1 GB
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-primary/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${isOverLimit ? "bg-destructive" : isNearLimit ? "bg-yellow-500" : "bg-gradient-to-r from-primary to-primary/70"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {isOverLimit ? "Storage limit reached — delete files to free space" : isNearLimit ? "Running low on storage" : `${(100 - pct).toFixed(1)}% remaining`}
                  </p>
                </div>
              );
            })()}

            {storageAnalytics && Object.keys(storageAnalytics.byType).length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Storage by Type
                </p>
                <div className="space-y-2">
                  {Object.entries(storageAnalytics.byType).sort(([, a], [, b]) => b - a).map(([type, size]) => {
                    const pct = storageAnalytics.totalSize > 0 ? (size / storageAnalytics.totalSize) * 100 : 0;
                    const colors: Record<string, string> = { Images: "bg-blue-500", Videos: "bg-purple-500", Audio: "bg-pink-500", Documents: "bg-amber-500", Other: "bg-slate-400" };
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground font-medium">{type}</span>
                          <span className="text-[10px] text-muted-foreground">{formatFileSize(size)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                          <div className={`h-full rounded-full ${colors[type] || "bg-primary"} transition-all duration-500`} style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {storageAnalytics && storageAnalytics.largest.length > 0 && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Largest Files</p>
                <div className="space-y-1.5">
                  {storageAnalytics.largest.map((f, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span className="text-xs text-foreground truncate flex-1 mr-2">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">{formatFileSize(f.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SettingsCategory>

        {/* ═══════ NOTIFICATIONS & UPDATES ═══════ */}
        <SettingsCategory icon={Megaphone} label="Announcements & Updates">
          {announcements.length === 0 ? (
            <div className="text-center py-6">
              <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No announcements yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Updates from our Telegram channel will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(showAllAnnouncements ? announcements : announcements.slice(0, 3)).map((ann) => {
                const typeConfig: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
                  feature: { icon: Sparkles, color: "text-purple-500 bg-purple-500/15", label: "Feature" },
                  announcement: { icon: Megaphone, color: "text-primary bg-primary/15", label: "Announcement" },
                  maintenance: { icon: Wrench, color: "text-amber-500 bg-amber-500/15", label: "Maintenance" },
                  update: { icon: Bell, color: "text-emerald-500 bg-emerald-500/15", label: "Update" },
                };
                const cfg = typeConfig[ann.type] || typeConfig.update;
                const Icon = cfg.icon;
                return (
                  <div key={ann.id} className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                    <div className="flex items-start gap-3">
                      <a href={ann.telegram_message_id ? `https://t.me/copyrightpost/${ann.telegram_message_id}` : "https://t.me/copyrightpost"} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-lg ${cfg.color} shrink-0 hover:scale-110 transition-transform cursor-pointer`}>
                        <Icon className="w-3.5 h-3.5" />
                      </a>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-[10px] text-muted-foreground">{getTimeAgo(ann.created_at)}</span>
                          <a href={ann.telegram_message_id ? `https://t.me/copyrightpost/${ann.telegram_message_id}` : "https://t.me/copyrightpost"} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {ann.title && <p className="text-sm font-medium text-foreground mb-1">{ann.title}</p>}
                        <p className="text-xs text-muted-foreground leading-relaxed">{ann.content}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2">— {ann.author}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {announcements.length > 3 && (
                <button onClick={() => setShowAllAnnouncements(!showAllAnnouncements)} className="w-full py-2 text-sm text-primary font-medium hover:underline">
                  {showAllAnnouncements ? "Show less" : `View all ${announcements.length} announcements`}
                </button>
              )}
            </div>
          )}
        </SettingsCategory>

        {/* ═══════ ABOUT ═══════ */}
        <SettingsCategory icon={Info} label="About & Developer">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium text-foreground">{t("settings.developedBy")}</span>
              <span className="text-sm text-primary font-semibold">sayfalse</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Github className="w-3.5 h-3.5 text-primary" />GitHub Profile</span>
              <a href="https://github.com/sayfalse" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-semibold hover:underline">@sayfalse</a>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Github className="w-3.5 h-3.5 text-primary" />GitHub Organization</span>
              <a href="https://github.com/sevenminutesbd" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-semibold hover:underline">sevenminutesbd</a>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Send className="w-3.5 h-3.5 text-primary" />Telegram</span>
              <a href="https://t.me/copyrightpost" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-semibold hover:underline">@copyrightpost</a>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium text-foreground">{t("settings.version")}</span>
              <span className="text-xs text-primary bg-primary/15 px-2.5 py-0.5 rounded-full font-semibold">2.0.0</span>
            </div>
            <div className="pt-2 border-t border-border space-y-2">
              <a href="/privacy-policy" className="flex items-center justify-between py-2 rounded-lg hover:bg-accent px-2 -mx-2 transition-colors">
                <span className="text-sm text-foreground">{t("settings.privacyPolicy")}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a href="/terms-of-service" className="flex items-center justify-between py-2 rounded-lg hover:bg-accent px-2 -mx-2 transition-colors">
                <span className="text-sm text-foreground">{t("settings.termsOfService")}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        </SettingsCategory>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          {t("common.signOut")}
        </button>

        <DeleteAccountSection />
      </div>
      <ModuleSwitcher />
    </div>
  );
};

export default SettingsPage;
