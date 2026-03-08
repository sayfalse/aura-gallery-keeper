import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, ExternalLink, Mail } from "lucide-react";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const TempMailPage = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "https://m.kuku.lu/";
      setLoading(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h1 className="font-display text-sm font-bold text-foreground">Temp Mail</h1>
        </div>
        <QuickNavButton />
        <button onClick={handleRefresh} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title="Refresh">
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => window.open("https://m.kuku.lu/", "_blank", "noopener,noreferrer")} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title="Open externally">
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="https://m.kuku.lu/"
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 52px)" }}
          onLoad={() => setLoading(false)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          title="Temp Mail"
        />
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default TempMailPage;
