import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone } from "lucide-react";

const DISMISSED_KEY = "dismissed_announcement_id";

const AnnouncementOverlay = () => {
  const [announcement, setAnnouncement] = useState<{
    id: string; title: string | null; content: string; type: string | null; created_at: string;
  } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, type, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const latest = data[0];
        const dismissedId = localStorage.getItem(DISMISSED_KEY);
        if (dismissedId !== latest.id) {
          setAnnouncement(latest);
          setVisible(true);
        }
      }
    };
    fetch();
  }, []);

  const dismiss = () => {
    if (announcement) localStorage.setItem(DISMISSED_KEY, announcement.id);
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">
              {announcement.type === "maintenance" ? "Maintenance" : announcement.type === "feature" ? "New Feature" : "Announcement"}
            </p>
            <h2 className="text-base font-bold text-foreground truncate">{announcement.title || "New Announcement"}</h2>
          </div>
          <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-4">
            {new Date(announcement.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementOverlay;
