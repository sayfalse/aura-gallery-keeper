import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, RotateCw, X, Plus, Search, Globe, Star, Clock,
  Download, Bookmark, Trash2, ExternalLink, ChevronDown, Shield, Share2
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

type Panel = "none" | "tabs" | "history" | "bookmarks" | "downloads";

const Browser = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Tabs
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: crypto.randomUUID(), url: "", title: "New Tab", isActive: true, isLoading: false },
  ]);
  const activeTab = tabs.find((t) => t.isActive) || tabs[0];

  // URL bar
  const [urlInput, setUrlInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Panels
  const [panel, setPanel] = useState<Panel>("none");

  // Panel data
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);

  // Navigation history per tab
  const [navHistory, setNavHistory] = useState<Record<string, { back: string[]; forward: string[] }>>({});

  const updateTab = useCallback((id: string, updates: Partial<BrowserTab>) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const navigate = useCallback(
    (url: string) => {
      if (!url) return;
      const normalized = normalizeUrl(url);
      const tabId = activeTab.id;

      // Push current URL to back history
      if (activeTab.url) {
        setNavHistory((prev) => ({
          ...prev,
          [tabId]: {
            back: [...(prev[tabId]?.back || []), activeTab.url],
            forward: [],
          },
        }));
      }

      updateTab(tabId, {
        url: normalized,
        title: getDisplayUrl(normalized),
        isLoading: true,
      });
      setUrlInput(normalized);

      if (user) {
        addHistoryEntry(user.id, normalized, getDisplayUrl(normalized)).catch(() => {});
      }
    },
    [activeTab, updateTab, user]
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
  }, [activeTab, navHistory, updateTab]);

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
  }, [activeTab, navHistory, updateTab]);

  const reload = useCallback(() => {
    if (iframeRef.current && activeTab.url) {
      updateTab(activeTab.id, { isLoading: true });
      iframeRef.current.src = activeTab.url;
    }
  }, [activeTab, updateTab]);

  const addTab = useCallback(() => {
    const newTab: BrowserTab = {
      id: crypto.randomUUID(),
      url: "",
      title: "New Tab",
      isActive: true,
      isLoading: false,
    };
    setTabs((prev) => [...prev.map((t) => ({ ...t, isActive: false })), newTab]);
    setUrlInput("");
    setPanel("none");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length === 1) {
        updateTab(id, { url: "", title: "New Tab", isLoading: false });
        setUrlInput("");
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
      if (tab) setUrlInput(tab.url);
      setPanel("none");
    },
    [tabs]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      navigate(urlInput);
      inputRef.current?.blur();
      setIsFocused(false);
    }
  };

  const handleIframeLoad = () => {
    updateTab(activeTab.id, { isLoading: false });
  };

  // Load panel data
  const openPanel = async (p: Panel) => {
    if (panel === p) {
      setPanel("none");
      return;
    }
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
    } catch {
      toast.error("Failed to add bookmark");
    }
  };

  const handleShare = async () => {
    if (!activeTab.url) return;
    if (navigator.share) {
      await navigator.share({ title: activeTab.title, url: activeTab.url });
    } else {
      await navigator.clipboard.writeText(activeTab.url);
      toast.success("URL copied!");
    }
  };

  // Sync urlInput when switching tabs
  useEffect(() => {
    setUrlInput(activeTab.url);
  }, [activeTab.id]);

  const canGoBack = (navHistory[activeTab.id]?.back.length || 0) > 0;
  const canGoForward = (navHistory[activeTab.id]?.forward.length || 0) > 0;
  const isNewTab = !activeTab.url;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* WebView / New Tab */}
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
          />
        ) : (
          <>
            {activeTab.isLoading && (
              <div className="absolute top-0 left-0 right-0 z-10 h-0.5 bg-primary/20">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "90%" }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={activeTab.url}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            />
          </>
        )}

        {/* Slide-up panels */}
        <AnimatePresence>
          {panel !== "none" && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="absolute inset-0 z-20 bg-background flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-sm font-bold capitalize">{panel}</h2>
                <button onClick={() => setPanel("none")} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {panel === "tabs" && (
                  <TabsPanel tabs={tabs} onSwitch={switchTab} onClose={closeTab} onAdd={addTab} />
                )}
                {panel === "history" && (
                  <HistoryPanel
                    history={history}
                    onNavigate={(url) => { navigate(url); setPanel("none"); }}
                    onDelete={async (id) => {
                      await deleteHistoryEntry(id);
                      setHistory((h) => h.filter((e) => e.id !== id));
                    }}
                    onClear={async () => {
                      if (!user) return;
                      await clearHistory(user.id);
                      setHistory([]);
                      toast.success("History cleared");
                    }}
                  />
                )}
                {panel === "bookmarks" && (
                  <BookmarksPanel
                    bookmarks={bookmarks}
                    onNavigate={(url) => { navigate(url); setPanel("none"); }}
                    onDelete={async (id) => {
                      await deleteBookmark(id);
                      setBookmarks((b) => b.filter((e) => e.id !== id));
                    }}
                  />
                )}
                {panel === "downloads" && (
                  <DownloadsPanel
                    downloads={downloads}
                    onDelete={async (id) => {
                      await deleteDownloadEntry(id);
                      setDownloads((d) => d.filter((e) => e.id !== id));
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom toolbar - Safari/Chrome style */}
      {!isNewTab && (
        <div className="border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
          {/* URL bar */}
          <form onSubmit={handleSubmit} className="px-3 pt-2 pb-1">
            <div className="flex items-center gap-2 bg-muted/80 rounded-xl px-3 py-2">
              {activeTab.isLoading ? (
                <RotateCw className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={isFocused ? urlInput : getDisplayUrl(activeTab.url || "")}
                onChange={(e) => setUrlInput(e.target.value)}
                onFocus={() => { setIsFocused(true); setUrlInput(activeTab.url); }}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search or enter URL"
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none text-center"
              />
              {isFocused && urlInput && (
                <button type="button" onClick={() => setUrlInput("")} className="shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </form>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between px-6 py-1.5">
            <button onClick={goBack} disabled={!canGoBack} className="p-2 disabled:opacity-30">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <button onClick={goForward} disabled={!canGoForward} className="p-2 disabled:opacity-30">
              <ArrowRight className="w-5 h-5 text-primary" />
            </button>
            <button onClick={handleShare} className="p-2">
              <Share2 className="w-5 h-5 text-primary" />
            </button>
            <button onClick={handleBookmarkCurrent} disabled={!activeTab.url} className="p-2 disabled:opacity-30">
              <Bookmark className="w-5 h-5 text-primary" />
            </button>
            <button onClick={() => openPanel("tabs")} className="relative p-2">
              <div className="w-5 h-5 border-2 border-primary rounded-md flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{tabs.length}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      <ModuleSwitcher />
    </div>
  );
};

// === Sub-components ===

const NewTabPage = ({
  onNavigate, urlInput, setUrlInput, inputRef, handleSubmit, isFocused, setIsFocused,
}: {
  onNavigate: (url: string) => void;
  urlInput: string;
  setUrlInput: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleSubmit: (e: React.FormEvent) => void;
  isFocused: boolean;
  setIsFocused: (v: boolean) => void;
}) => (
  <div className="flex flex-col h-full px-5 pt-[env(safe-area-inset-top)]">
    <div className="flex-1 flex flex-col items-center justify-center gap-8 -mt-20">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/20">
        <Globe className="w-8 h-8 text-primary-foreground" />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="flex items-center gap-2 bg-muted/80 rounded-2xl px-4 py-3 border border-border focus-within:border-primary/40 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search or enter URL"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            autoFocus
          />
        </div>
      </form>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        {defaultQuickLinks.map((link) => (
          <button
            key={link.url}
            onClick={() => onNavigate(link.url)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted/60 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center text-xl shadow-sm">
              {link.icon}
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">{link.title}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Bottom menu for new tab */}
    <div className="flex items-center justify-center gap-8 pb-24 pt-4">
      <button className="flex flex-col items-center gap-1 text-muted-foreground">
        <Clock className="w-5 h-5" />
        <span className="text-[10px]">History</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-muted-foreground">
        <Star className="w-5 h-5" />
        <span className="text-[10px]">Bookmarks</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-muted-foreground">
        <Download className="w-5 h-5" />
        <span className="text-[10px]">Downloads</span>
      </button>
    </div>
  </div>
);

const TabsPanel = ({
  tabs, onSwitch, onClose, onAdd,
}: {
  tabs: BrowserTab[];
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
}) => (
  <div className="p-3 space-y-2">
    <button
      onClick={onAdd}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <Plus className="w-4 h-4" /> New Tab
    </button>
    {tabs.map((tab) => (
      <motion.div
        key={tab.id}
        layout
        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
          tab.isActive ? "border-primary/30 bg-primary/5" : "border-border hover:bg-muted/50"
        }`}
        onClick={() => onSwitch(tab.id)}
      >
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{tab.title || "New Tab"}</p>
          {tab.url && <p className="text-[10px] text-muted-foreground truncate">{getDisplayUrl(tab.url)}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          className="p-1 rounded-lg hover:bg-muted shrink-0"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </motion.div>
    ))}
  </div>
);

const HistoryPanel = ({
  history, onNavigate, onDelete, onClear,
}: {
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) => (
  <div className="p-3">
    {history.length > 0 && (
      <button
        onClick={onClear}
        className="w-full text-center text-xs text-destructive font-medium py-2 mb-2 rounded-lg hover:bg-destructive/5"
      >
        Clear All History
      </button>
    )}
    {history.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-8">No browsing history</p>
    ) : (
      <div className="space-y-1">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer group"
            onClick={() => onNavigate(entry.url)}
          >
            {entry.favicon_url ? (
              <img src={entry.favicon_url} className="w-5 h-5 rounded shrink-0" alt="" />
            ) : (
              <Globe className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{entry.title || entry.url}</p>
              <p className="text-[10px] text-muted-foreground truncate">{getDisplayUrl(entry.url)}</p>
            </div>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {format(new Date(entry.visited_at), "HH:mm")}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
            >
              <X className="w-3 h-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const BookmarksPanel = ({
  bookmarks, onNavigate, onDelete,
}: {
  bookmarks: BookmarkType[];
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="p-3">
    {bookmarks.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-8">No bookmarks yet</p>
    ) : (
      <div className="space-y-1">
        {bookmarks.map((bm) => (
          <div
            key={bm.id}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer group"
            onClick={() => onNavigate(bm.url)}
          >
            {bm.favicon_url ? (
              <img src={bm.favicon_url} className="w-5 h-5 rounded shrink-0" alt="" />
            ) : (
              <Star className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{bm.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{getDisplayUrl(bm.url)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(bm.id); }}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

const DownloadsPanel = ({
  downloads, onDelete,
}: {
  downloads: DownloadEntry[];
  onDelete: (id: string) => void;
}) => (
  <div className="p-3">
    {downloads.length === 0 ? (
      <p className="text-center text-sm text-muted-foreground py-8">No downloads</p>
    ) : (
      <div className="space-y-1">
        {downloads.map((dl) => (
          <div key={dl.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 group">
            <Download className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{dl.file_name}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(dl.created_at), "MMM d, HH:mm")}
              </p>
            </div>
            <button
              onClick={() => onDelete(dl.id)}
              className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default Browser;
