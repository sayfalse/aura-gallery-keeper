import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Share2, BookOpen, ChevronLeft, ChevronRight, RotateCw, Lock, RefreshCw, Search, ExternalLink, Globe } from "lucide-react";
import ModuleSwitcher from "@/components/ModuleSwitcher";

const SEARCH_ENGINE = "https://www.google.com/search?igu=1&q=";

const BrowserPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loadError, setLoadError] = useState(false);
  const [started, setStarted] = useState(false);
  const loadTimeout = useRef<ReturnType<typeof setTimeout>>();

  const navigateTo = (target: string) => {
    setUrl(target);
    setLoading(true);
    setLoadError(false);
    setStarted(true);
    const newHistory = [...history.slice(0, historyIndex + 1), target];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    clearTimeout(loadTimeout.current);
    loadTimeout.current = setTimeout(() => setLoading(false), 8000);
  };

  useEffect(() => () => clearTimeout(loadTimeout.current), []);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      if (target.includes(".") && !target.includes(" ")) {
        target = "https://" + target;
      } else {
        target = `${SEARCH_ENGINE}${encodeURIComponent(target)}`;
      }
    }
    navigateTo(target);
    setFocused(false);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const i = historyIndex - 1;
      setHistoryIndex(i); setUrl(history[i]); setLoading(true); setLoadError(false);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1;
      setHistoryIndex(i); setUrl(history[i]); setLoading(true); setLoadError(false);
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current && url) {
      setLoadError(false); iframeRef.current.src = url; setLoading(true);
    }
  };

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: "Shared from Browser", url });
    else navigator.clipboard.writeText(url);
  };

  const displayUrl = () => {
    if (!url) return "";
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  };

  const isSecure = url.startsWith("https://");
  const handleIframeLoad = () => { setLoading(false); clearTimeout(loadTimeout.current); };
  const openExternal = () => { if (url) window.open(url, "_blank", "noopener,noreferrer"); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 z-20 h-[2px] bg-secondary overflow-hidden">
            <div className="h-full bg-primary animate-pulse" style={{ width: "70%", animation: "safari-load 1.5s ease-in-out infinite" }} />
          </div>
        )}

        {!started ? (
          <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "calc(100vh - 88px)" }}>
            <Globe className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">{t("browser.searchTheWeb")}</p>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">{t("browser.searchPrompt")}</p>
            <button onClick={() => setFocused(true)} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              {t("browser.startBrowsing")}
            </button>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center" style={{ height: "calc(100vh - 88px)" }}>
            <Search className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <p className="text-base font-medium text-foreground mb-1">{t("browser.cantLoad")}</p>
              <p className="text-sm text-muted-foreground">{t("browser.cantLoadDesc")}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={openExternal} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> {t("common.openExternally")}
              </button>
              <button onClick={() => { setStarted(false); setUrl(""); }} className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium">
                {t("common.newSearch")}
              </button>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef} src={url} className="w-full border-0" style={{ height: "calc(100vh - 88px)" }}
            onLoad={handleIframeLoad}
            onError={() => { setLoading(false); setLoadError(true); clearTimeout(loadTimeout.current); }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; picture-in-picture; fullscreen"
            referrerPolicy="no-referrer-when-downgrade" title="Browser"
          />
        )}
      </div>

      <div className="shrink-0 bg-card/95 backdrop-blur-2xl border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 pt-2 pb-1">
          {focused ? (
            <form onSubmit={handleNavigate} className="flex items-center gap-2">
              <input
                type="text" value={inputUrl} onChange={(e) => setInputUrl(e.target.value)}
                placeholder={t("browser.searchOrEnter")} autoFocus
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                className="flex-1 px-4 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none ring-2 ring-primary/30"
              />
              <button type="button" onClick={() => setFocused(false)} className="text-sm text-primary font-medium px-2 py-2">
                {t("common.cancel")}
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setFocused(true); setInputUrl(url || ""); }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors"
            >
              {url && isSecure && <Lock className="w-3 h-3 text-muted-foreground" />}
              <span className="text-sm text-foreground font-medium truncate">
                {displayUrl() || t("browser.searchOrEnterUrl")}
              </span>
              {loading && <RotateCw className="w-3 h-3 text-muted-foreground animate-spin ml-1" />}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-1.5">
          <button onClick={goBack} disabled={historyIndex <= 0} className="p-2 disabled:opacity-30 text-primary transition-opacity"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={goForward} disabled={historyIndex >= history.length - 1} className="p-2 disabled:opacity-30 text-primary transition-opacity"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={handleShare} disabled={!url} className="p-2 text-primary disabled:opacity-30"><Share2 className="w-5 h-5" /></button>
          <button onClick={() => navigate("/")} className="p-2 text-primary"><BookOpen className="w-5 h-5" /></button>
          <button onClick={handleRefresh} disabled={!url} className="p-2 text-primary disabled:opacity-30"><RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>
    </div>
  );
};

export default BrowserPage;
