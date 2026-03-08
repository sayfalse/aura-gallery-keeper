import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Share2, BookOpen, ChevronLeft, ChevronRight, RotateCw, Lock, RefreshCw, Search } from "lucide-react";
import ModuleSwitcher from "@/components/ModuleSwitcher";

const BrowserPage = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState("https://www.google.com/webhp?igu=1");
  const [inputUrl, setInputUrl] = useState("google.com");
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>(["https://www.google.com/webhp?igu=1"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const navigateTo = (target: string) => {
    setUrl(target);
    setLoading(true);
    setLoadError(false);
    const newHistory = [...history.slice(0, historyIndex + 1), target];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      if (target.includes(".") && !target.includes(" ")) {
        target = "https://" + target;
      } else {
        target = `https://www.google.com/search?igu=1&q=${encodeURIComponent(target)}`;
      }
    }
    navigateTo(target);
    setFocused(false);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setLoading(true);
      setLoadError(false);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      setLoading(true);
      setLoadError(false);
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setLoadError(false);
      iframeRef.current.src = url;
      setLoading(true);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Shared from Browser", url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const displayUrl = () => {
    try {
      const u = new URL(url);
      return u.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const isSecure = url.startsWith("https://");

  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Page content */}
      <div className="flex-1 relative">
        {/* Loading progress bar */}
        {loading && (
          <div className="absolute top-0 left-0 right-0 z-20 h-[2px] bg-secondary overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: "70%", animation: "safari-load 1.5s ease-in-out infinite" }} />
          </div>
        )}

        {loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center" style={{ height: "calc(100vh - 88px)" }}>
            <Search className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <p className="text-base font-medium text-foreground mb-1">Page can't be loaded</p>
              <p className="text-sm text-muted-foreground">This site may block embedding. Try opening it directly in your device browser.</p>
            </div>
            <button
              onClick={() => window.open(url, "_blank")}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              Open in External Browser
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full border-0"
            style={{ height: "calc(100vh - 88px)" }}
            onLoad={handleIframeLoad}
            onError={() => { setLoading(false); setLoadError(true); }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
            title="Browser"
          />
        )}
      </div>

      {/* Safari-style bottom toolbar */}
      <div className="shrink-0 bg-card/95 backdrop-blur-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        {/* URL Bar */}
        <div className="px-3 pt-2 pb-1">
          {focused ? (
            <form onSubmit={handleNavigate} className="flex items-center gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Search or enter website name"
                autoFocus
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                className="flex-1 px-4 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none ring-2 ring-primary/30"
              />
              <button type="button" onClick={() => setFocused(false)} className="text-sm text-primary font-medium px-2 py-2">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setFocused(true); setInputUrl(url); }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors"
            >
              {isSecure && <Lock className="w-3 h-3 text-muted-foreground" />}
              <span className="text-sm text-foreground font-medium truncate">{displayUrl()}</span>
              {loading && <RotateCw className="w-3 h-3 text-muted-foreground animate-spin ml-1" />}
            </button>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between px-6 py-1.5">
          <button onClick={goBack} disabled={historyIndex <= 0} className="p-2 disabled:opacity-30 text-primary transition-opacity">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goForward} disabled={historyIndex >= history.length - 1} className="p-2 disabled:opacity-30 text-primary transition-opacity">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={handleShare} className="p-2 text-primary">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={() => navigate("/")} className="p-2 text-primary">
            <BookOpen className="w-5 h-5" />
          </button>
          <button onClick={handleRefresh} className="p-2 text-primary">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrowserPage;
