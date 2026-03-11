import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ArrowUpCircle } from "lucide-react";

const APP_VERSION = "4.0.0";
const DISMISSED_VERSION_KEY = "dismissed_update_version";

const compareVersions = (a: string, b: string): number => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

const UpdateOverlay = () => {
  const [update, setUpdate] = useState<{ version: string; download_url: string | null; release_notes: string | null } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("app_version")
        .select("version, download_url, release_notes")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const remote = data[0];
        if (compareVersions(remote.version, APP_VERSION) > 0) {
          const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
          if (dismissed !== remote.version) {
            setUpdate(remote);
            setVisible(true);
          }
        }
      }
    };
    check();
  }, []);

  const dismiss = () => {
    if (update) localStorage.setItem(DISMISSED_VERSION_KEY, update.version);
    setVisible(false);
  };

  if (!visible || !update) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Update Available</p>
            <h2 className="text-base font-bold text-foreground">Version {update.version}</h2>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A new version of PixelVault is available. Update now for the latest features and improvements.
          </p>
          {update.release_notes && (
            <p className="text-xs text-muted-foreground/80 mt-3 whitespace-pre-wrap">{update.release_notes}</p>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={dismiss} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-accent transition-colors">
            Later
          </button>
          {update.download_url && (
            <a
              href={update.download_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium text-center hover:bg-emerald-600 transition-colors"
            >
              Update Now
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateOverlay;
