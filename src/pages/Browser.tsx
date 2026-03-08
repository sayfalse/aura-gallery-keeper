import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, RotateCw, X, Plus, Search, Globe, Star, Clock,
  Download, Bookmark, Trash2, Shield, Share2, Menu, Home as HomeIcon, Compass
} from "lucide-react";
import { toast } from "sonner";
import {
  BrowserTab, normalizeUrl, getDisplayUrl, defaultQuickLinks,
  addHistoryEntry, fetchHistory, clearHistory, deleteHistoryEntry,
  fetchBookmarks, addBookmark, deleteBookmark,
  fetchDownloads, deleteDownloadEntry,
  HistoryEntry, Bookmark as BookmarkType, DownloadEntry
} from "@/lib/browserService";
import { format } from "date-fns";

type Panel = "none" | "tabs" | "history" | "bookmarks" | "downloads" | "menu";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const Browser = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: crypto.randomUUID(), url: "", title: "New Tab", isActive: true, isLoading: false },
  ]);
  const activeTab = tabs.find((t) => t.isActive) || tabs[0];

  const [urlInput, setUrlInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<Panel>("none");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [navHistory, setNavHistory] = useState<Record<string, { back: string[]; forward: string[] }>>({});

  const updateTab = useCallback((id: string, updates: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const buildProxyUrl = useCallback((url: string) => {
    return `${SUPABASE_URL}/functions/v1/web-proxy?url=${encodeURIComponent(url)}`;
  }, []);

  const loadUrl = useCallback((url: string) => {
    setProxyUrl(buildProxyUrl(url));
  }, [buildProxyUrl]);

  const navigate = useCallback(
    (url: string) => {
      if (!url) return;
      const normalized = normalizeUrl(url);
      const tabId = activeTab.id;
      if (activeTab.url) {
        setNavHistory((prev) => ({
          ...prev,
          [tabId]: { back: [...(prev[tabId]?.back || []), activeTab.url], forward: [] },
        }));
      }
      updateTab(tabId, { url: normalized, title: getDisplayUrl(normalized), isLoading: true });
      setUrlInput(normalized);
      loadUrl(normalized);
      // Mark as loaded after a brief delay (iframe handles its own loading)
      setTimeout(() => updateTab(tabId, { isLoading: false }), 2000);
      if (user) addHistoryEntry(user.id, normalized, getDisplayUrl(normalized)).catch(() => {});
    },
    [activeTab, updateTab, user, loadUrl]
  );

  const goBack = useCallback(() => {
    const hist = navHistory[activeTab.id];
    if (!hist?.back.length) return;
    const prev = [...hist.back];
    const url = prev.pop()!;
    setNavHistory((h) => ({
      ...h,
      [activeTab.id]: { back: prev, forward: [...(h[activeTab.id]?.forward || []), activeTab.url] },
    }));
    updateTab(activeTab.id, { url, title: getDisplayUrl(url), isLoading: true });
    setUrlInput(url);
    loadUrl(url);
    setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 2000);
  }, [activeTab, navHistory, updateTab, loadUrl]);

  const goForward = useCallback(() => {
    const hist = navHistory[activeTab.id];
    if (!hist?.forward.length) return;
    const fwd = [...hist.forward];
    const url = fwd.pop()!;
    setNavHistory((h) => ({
      ...h,
      [activeTab.id]: { back: [...(h[activeTab.id]?.back || []), activeTab.url], forward: fwd },
    }));
    updateTab(activeTab.id, { url, title: getDisplayUrl(url), isLoading: true });
    setUrlInput(url);
    loadUrl(url);
    setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 2000);
  }, [activeTab, navHistory, updateTab, loadUrl]);

  const reload = useCallback(() => {
    if (activeTab.url) {
      updateTab(activeTab.id, { isLoading: true });
      loadUrl(activeTab.url);
      setTimeout(() => updateTab(activeTab.id, { isLoading: false }), 2000);
    }
  }, [activeTab, updateTab, loadUrl]);

  const addTab = useCallback(() => {
    setTabs((prev) => [
      ...prev.map((t) => ({ ...t, isActive: false })),
      { id: crypto.randomUUID(), url: "", title: "New Tab", isActive: true, isLoading: false },
    ]);
    setUrlInput("");
    setProxyUrl(null);
    setPanel("none");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length === 1) {
        updateTab(id, { url: "", title: "New Tab", isLoading: false });
        setUrlInput("");
        setProxyUrl(null);
        return;
      }
      const idx = tabs.findIndex((t) => t.id === id);
      const wasActive = tabs[idx].isActive;
      const newTabs = tabs.filter((t) => t.id !== id);
      if (wasActive && newTabs.length > 0) {
        const activateIdx = Math.min(idx, newTabs.length - 1);
        newTabs[activateIdx].isActive = true;
        setUrlInput(newTabs[activateIdx].url);
      }
      setTabs(newTabs);
    },
    [tabs, updateTab]
  );

  const switchTab = useCallback(
    (id: string) => {
      setTabs((prev) => prev.map((t) => ({ ...t, isActive: t.id === id })));
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        setUrlInput(tab.url);
        if (tab.url) loadUrl(tab.url);
        else setProxyUrl(null);
      }
      setPanel("none");
    },
    [tabs, loadUrl]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigate(urlInput);
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  const openPanel = async (p: Panel) => {
    if (panel === p) { setPanel("none"); return; }
    setPanel(p);
    if (!user) return;
    try {
      if (p === "history") setHistory(await fetchHistory(user.id));
      if (p === "bookmarks") setBookmarks(await fetchBookmarks(user.id));
      if (p === "downloads") setDownloads(await fetchDownloads(user.id));
    } catch {}
  };

  const handleBookmarkCurrent = async () => {
    if (!user || !activeTab.url) return;
    try {
      await addBookmark(user.id, activeTab.url, activeTab.title);
      toast.success("Bookmark added!");
    } catch { toast.error("Failed to add bookmark"); }
  };

  const handleShare = async () => {
    if (!activeTab.url) return;
    if (navigator.share) await navigator.share({ title: activeTab.title, url: activeTab.url });
    else { await navigator.clipboard.writeText(activeTab.url); toast.success("URL copied!"); }
  };

  useEffect(() => { setUrlInput(activeTab.url); }, [activeTab.id]);

  const canGoBack = (navHistory[activeTab.id]?.back.length || 0) > 0;
  const canGoForward = (navHistory[activeTab.id]?.forward.length || 0) > 0;
  const isNewTab = !activeTab.url;

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Loading bar */}
      {activeTab.isLoading && (
        <div className="absolute top-0 left-0 right-0 z-50 h-[2px]">
          <motion.div
            className="h-full bg-primary rounded-r-full"
            initial={{ width: "0%" }}
            animate={{ width: "85%" }}
            transition={{ duration: 3, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {isNewTab ? (
          <NewTabPage
            onNavigate={navigate}
            urlInput={urlInput}
            setUrlInput={setUrlInput}
            inputRef={inputRef}
            handleSubmit={handleSubmit}
            isFocused={isFocused}
            setIsFocused={setIsFocused}
            onOpenPanel={openPanel}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={proxyUrl || undefined}
            className="w-full h-full border-0 bg-background"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => updateTab(activeTab.id, { isLoading: false })}
          />
        )}

        {/* Slide-up panels */}
        <AnimatePresence>
          {panel !== "none" && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 380 }}
              className="absolute inset-0 z-30 bg-background/95 backdrop-blur-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h2 className="text-base font-bold text-foreground capitalize">{panel === "menu" ? "More" : panel}</h2>
                <button onClick={() => setPanel("none")} className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {panel === "tabs" && <TabsPanel tabs={tabs} onSwitch={switchTab} onClose={closeTab} onAdd={addTab} />}
                {panel === "history" && (
                  <HistoryPanel
                    history={history}
                    onNavigate={(url) => { navigate(url); setPanel("none"); }}
                    onDelete={async (id) => { await deleteHistoryEntry(id); setHistory((h) => h.filter((e) => e.id !== id)); }}
                    onClear={async () => { if (!user) return; await clearHistory(user.id); setHistory([]); toast.success("History cleared"); }}
                  />
                )}
                {panel === "bookmarks" && (
                  <BookmarksPanel
                    bookmarks={bookmarks}
                    onNavigate={(url) => { navigate(url); setPanel("none"); }}
                    onDelete={async (id) => { await deleteBookmark(id); setBookmarks((b) => b.filter((e) => e.id !== id)); }}
                  />
                )}
                {panel === "downloads" && (
                  <DownloadsPanel
                    downloads={downloads}
                    onDelete={async (id) => { await deleteDownloadEntry(id); setDownloads((d) => d.filter((e) => e.id !== id)); }}
                  />
                )}
                {panel === "menu" && (
                  <MenuPanel
                    onBookmark={handleBookmarkCurrent}
                    onShare={handleShare}
                    onHistory={() => openPanel("history")}
                    onBookmarks={() => openPanel("bookmarks")}
                    onDownloads={() => openPanel("downloads")}
                    onReload={reload}
                    hasUrl={!!activeTab.url}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Safari-style toolbar */}
      {!isNewTab && (
        <div className="shrink-0 border-t border-border/60 bg-card/80 backdrop-blur-2xl">
          {/* URL bar */}
          <form onSubmit={handleSubmit} className="px-3 pt-2.5 pb-1.5">
            <motion.div
              className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 transition-all duration-200 ${
                isFocused
                  ? "bg-background border border-primary/30 shadow-sm shadow-primary/5"
                  : "bg-muted/60 border border-transparent"
              }`}
            >
              {activeTab.isLoading ? (
                <RotateCw className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={isFocused ? urlInput : getDisplayUrl(activeTab.url || "")}
                onChange={(e) => setUrlInput(e.target.value)}
                onFocus={() => { setIsFocused(true); setUrlInput(activeTab.url); }}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search or enter URL"
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none text-center font-medium"
              />
              {isFocused && urlInput && (
                <button type="button" onClick={() => setUrlInput("")} className="shrink-0 p-0.5 rounded-full bg-muted-foreground/15">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </motion.div>
          </form>

          {/* Navigation row */}
          <div className="flex items-center justify-between px-4 py-1 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            <button onClick={goBack} disabled={!canGoBack} className="p-2.5 rounded-xl active:bg-muted/60 transition-colors disabled:opacity-25">
              <ArrowLeft className="w-[22px] h-[22px] text-primary" strokeWidth={2} />
            </button>
            <button onClick={goForward} disabled={!canGoForward} className="p-2.5 rounded-xl active:bg-muted/60 transition-colors disabled:opacity-25">
              <ArrowRight className="w-[22px] h-[22px] text-primary" strokeWidth={2} />
            </button>
            <button onClick={handleShare} className="p-2.5 rounded-xl active:bg-muted/60 transition-colors">
              <Share2 className="w-[22px] h-[22px] text-primary" strokeWidth={2} />
            </button>
            <button onClick={() => openPanel("tabs")} className="p-2.5 rounded-xl active:bg-muted/60 transition-colors relative">
              <div className="w-[22px] h-[22px] border-[2.5px] border-primary rounded-[6px] flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary leading-none">{tabs.length}</span>
              </div>
            </button>
            <button onClick={() => openPanel("menu")} className="p-2.5 rounded-xl active:bg-muted/60 transition-colors">
              <Menu className="w-[22px] h-[22px] text-primary" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {isNewTab && <ModuleSwitcher />}
    </div>
  );
};

// Loading placeholder
const loadingPage = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
  body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:-apple-system,system-ui,sans-serif;background:#f8f9fa;}
  .dot{width:8px;height:8px;border-radius:50%;background:#94a3b8;animation:pulse 1.2s infinite;margin:0 4px;}
  .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
  @media(prefers-color-scheme:dark){body{background:#0a0a0a;}.dot{background:#475569;}}
</style></head><body><div style="display:flex"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></body></html>`;

// === New Tab Page ===
const NewTabPage = ({
  onNavigate, urlInput, setUrlInput, inputRef, handleSubmit, isFocused, setIsFocused, onOpenPanel,
}: {
  onNavigate: (url: string) => void;
  urlInput: string;
  setUrlInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e: React.FormEvent) => void;
  isFocused: boolean;
  setIsFocused: (v: boolean) => void;
  onOpenPanel: (p: Panel) => void;
}) => (
  <div className="flex flex-col h-full pt-[env(safe-area-inset-top)]">
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 -mt-16">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-primary via-primary/90 to-secondary flex items-center justify-center shadow-2xl shadow-primary/25">
          <Compass className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
        </div>
        <div className="absolute -inset-2 rounded-[34px] bg-primary/10 blur-xl -z-10" />
      </motion.div>

      {/* Search bar */}
      <motion.form
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md"
      >
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 ${
          isFocused
            ? "bg-background border border-primary/30 shadow-lg shadow-primary/5"
            : "bg-muted/50 border border-border/60"
        }`}>
          <Search className="w-[18px] h-[18px] text-muted-foreground/50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search or enter URL"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-medium"
            autoFocus
          />
        </div>
      </motion.form>

      {/* Quick links grid */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="grid grid-cols-4 gap-3 w-full max-w-sm"
      >
        {defaultQuickLinks.map((link) => (
          <motion.button
            key={link.url}
            whileTap={{ scale: 0.92 }}
            onClick={() => onNavigate(link.url)}
            className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl hover:bg-muted/50 active:bg-muted transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-lg shadow-sm">
              {link.icon}
            </div>
            <span className="text-[10px] text-muted-foreground font-medium leading-tight">{link.title}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>

    {/* Bottom shortcuts */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex items-center justify-center gap-10 pb-24 pt-3"
    >
      {[
        { icon: Clock, label: "History", panel: "history" as Panel },
        { icon: Star, label: "Bookmarks", panel: "bookmarks" as Panel },
        { icon: Download, label: "Downloads", panel: "downloads" as Panel },
      ].map(({ icon: Icon, label, panel }) => (
        <button
          key={label}
          onClick={() => onOpenPanel(panel)}
          className="flex flex-col items-center gap-1 text-muted-foreground/70 hover:text-primary transition-colors"
        >
          <Icon className="w-5 h-5" strokeWidth={1.8} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </motion.div>
  </div>
);

// === Tabs Panel ===
const TabsPanel = ({
  tabs, onSwitch, onClose, onAdd,
}: {
  tabs: BrowserTab[];
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}) => (
  <div className="px-4 pb-8 space-y-2.5">
    <button
      onClick={onAdd}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border/60 text-sm text-muted-foreground font-medium hover:bg-muted/30 hover:border-primary/20 transition-all"
    >
      <Plus className="w-4 h-4" /> New Tab
    </button>
    {tabs.map((tab, i) => (
      <motion.div
        key={tab.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.98] ${
          tab.isActive
            ? "border-primary/25 bg-primary/5 shadow-sm shadow-primary/5"
            : "border-border/40 hover:bg-muted/30"
        }`}
        onClick={() => onSwitch(tab.id)}
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          tab.isActive ? "bg-primary/10" : "bg-muted/60"
        }`}>
          <Globe className={`w-4 h-4 ${tab.isActive ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{tab.title || "New Tab"}</p>
          {tab.url && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{getDisplayUrl(tab.url)}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          className="p-1.5 rounded-xl hover:bg-destructive/10 transition-colors shrink-0"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </motion.div>
    ))}
  </div>
);

// === History Panel ===
const HistoryPanel = ({
  history, onNavigate, onDelete, onClear,
}: {
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) => (
  <div className="px-4 pb-8">
    {history.length > 0 && (
      <button
        onClick={onClear}
        className="w-full text-center text-xs text-destructive font-semibold py-2.5 mb-3 rounded-xl hover:bg-destructive/5 transition-colors"
      >
        Clear All History
      </button>
    )}
    {history.length === 0 ? (
      <div className="flex flex-col items-center py-16 text-muted-foreground/50">
        <Clock className="w-10 h-10 mb-3" strokeWidth={1.3} />
        <p className="text-sm font-medium">No browsing history</p>
      </div>
    ) : (
      <div className="space-y-0.5">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 cursor-pointer group transition-colors active:bg-muted/60"
            onClick={() => onNavigate(entry.url)}
          >
            {entry.favicon_url ? (
              <img src={entry.favicon_url} className="w-6 h-6 rounded-lg shrink-0" alt="" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{entry.title || entry.url}</p>
              <p className="text-[11px] text-muted-foreground/60 truncate">{getDisplayUrl(entry.url)}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/40 shrink-0 font-medium">
              {format(new Date(entry.visited_at), "HH:mm")}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

// === Bookmarks Panel ===
const BookmarksPanel = ({
  bookmarks, onNavigate, onDelete,
}: {
  bookmarks: BookmarkType[];
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="px-4 pb-8">
    {bookmarks.length === 0 ? (
      <div className="flex flex-col items-center py-16 text-muted-foreground/50">
        <Star className="w-10 h-10 mb-3" strokeWidth={1.3} />
        <p className="text-sm font-medium">No bookmarks yet</p>
      </div>
    ) : (
      <div className="space-y-0.5">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 cursor-pointer group transition-colors active:bg-muted/60"
            onClick={() => onNavigate(bm.url)}
          >
            {bm.favicon_url ? (
              <img src={bm.favicon_url} className="w-6 h-6 rounded-lg shrink-0" alt="" />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{bm.title}</p>
              <p className="text-[11px] text-muted-foreground/60 truncate">{getDisplayUrl(bm.url)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(bm.id); }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

// === Downloads Panel ===
const DownloadsPanel = ({
  downloads, onDelete,
}: {
  downloads: DownloadEntry[];
  onDelete: (id: string) => void;
}) => (
  <div className="px-4 pb-8">
    {downloads.length === 0 ? (
      <div className="flex flex-col items-center py-16 text-muted-foreground/50">
        <Download className="w-10 h-10 mb-3" strokeWidth={1.3} />
        <p className="text-sm font-medium">No downloads</p>
      </div>
    ) : (
      <div className="space-y-0.5">
        {downloads.map((dl) => (
          <div key={dl.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 group transition-colors">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{dl.file_name}</p>
              <p className="text-[11px] text-muted-foreground/60">
                {format(new Date(dl.created_at), "MMM d, HH:mm")}
              </p>
            </div>
            <button
              onClick={() => onDelete(dl.id)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

// === Menu Panel ===
const MenuPanel = ({
  onBookmark, onShare, onHistory, onBookmarks, onDownloads, onReload, hasUrl,
}: {
  onBookmark: () => void;
  onShare: () => void;
  onHistory: () => void;
  onBookmarks: () => void;
  onDownloads: () => void;
  onReload: () => void;
  hasUrl: boolean;
}) => (
  <div className="px-4 pb-8 space-y-1">
    {[
      { icon: RotateCw, label: "Reload Page", action: onReload, show: hasUrl },
      { icon: Bookmark, label: "Add Bookmark", action: onBookmark, show: hasUrl },
      { icon: Share2, label: "Share", action: onShare, show: hasUrl },
      { icon: Clock, label: "History", action: onHistory, show: true },
      { icon: Star, label: "Bookmarks", action: onBookmarks, show: true },
      { icon: Download, label: "Downloads", action: onDownloads, show: true },
    ]
      .filter((item) => item.show)
      .map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-foreground/70" strokeWidth={1.8} />
          </div>
          <span className="text-[14px] font-medium text-foreground">{label}</span>
        </button>
      ))}
  </div>
);

export default Browser;
