import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Globe, RefreshCw, Search, ExternalLink, Home } from "lucide-react";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const BrowserPage = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState("https://www.google.com/webhp?igu=1");
  const [inputUrl, setInputUrl] = useState("https://www.google.com");
  const [loading, setLoading] = useState(true);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      // If it looks like a URL, add https, otherwise search Google
      if (target.includes(".") && !target.includes(" ")) {
        target = "https://" + target;
      } else {
        target = `https://www.google.com/search?igu=1&q=${encodeURIComponent(target)}`;
      }
    }
    setUrl(target);
    setLoading(true);
  };

  const handleHome = () => {
    setUrl("https://www.google.com/webhp?igu=1");
    setInputUrl("https://www.google.com");
    setLoading(true);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = url;
      setLoading(true);
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Globe className="w-4 h-4 text-primary shrink-0" />
          <form onSubmit={handleNavigate} className="flex-1 flex items-center">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Search or enter URL..."
              className="w-full px-3 py-1.5 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </form>
        </div>
        <button onClick={handleHome} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title="Home">
          <Home className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={handleRefresh} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title="Refresh">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={handleOpenExternal} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title="Open externally">
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
        <QuickNavButton />
      </header>

      {/* Browser Content */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 56px)" }}
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          title="Browser"
        />
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default BrowserPage;
