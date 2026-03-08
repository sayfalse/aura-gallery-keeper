import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, RefreshCw, ExternalLink, Mail, AlertCircle } from "lucide-react";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const TEMP_MAIL_URL = "https://m.kuku.lu/";

const TempMailPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (loading) { setLoading(false); setLoadFailed(true); }
    }, 10000);
    return () => clearTimeout(timeoutRef.current);
  }, [loading]);

  const handleRefresh = () => {
    setLoadFailed(false); setLoading(true);
    if (iframeRef.current) iframeRef.current.src = TEMP_MAIL_URL;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (loading) { setLoading(false); setLoadFailed(true); }
    }, 10000);
  };

  const handleLoad = () => { setLoading(false); setLoadFailed(false); clearTimeout(timeoutRef.current); };
  const openExternal = () => window.open(TEMP_MAIL_URL, "_blank", "noopener,noreferrer");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20 shrink-0">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h1 className="font-display text-sm font-bold text-foreground">{t("tempMail.title")}</h1>
        </div>
        <QuickNavButton />
        <button onClick={handleRefresh} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title={t("common.retry")}>
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={openExternal} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0" title={t("common.openExternally")}>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="flex-1 relative">
        {loading && !loadFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loadFailed ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center py-20">
            <AlertCircle className="w-12 h-12 text-muted-foreground/40" />
            <div>
              <p className="text-base font-medium text-foreground mb-1">{t("tempMail.cantLoad")}</p>
              <p className="text-sm text-muted-foreground max-w-xs">{t("tempMail.cantLoadDesc")}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={openExternal} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> {t("common.openInBrowser")}
              </button>
              <button onClick={handleRefresh} className="px-5 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> {t("common.retry")}
              </button>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef} src={TEMP_MAIL_URL} className="w-full h-full border-0"
            style={{ minHeight: "calc(100vh - 52px)" }}
            onLoad={handleLoad}
            onError={() => { setLoading(false); setLoadFailed(true); }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            title="Temp Mail"
          />
        )}
      </div>

      <ModuleSwitcher />
    </div>
  );
};

export default TempMailPage;
