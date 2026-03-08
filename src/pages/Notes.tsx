import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchNotes, createNote, updateNote, deleteNote, type Note } from "@/lib/noteService";
import { ArrowLeft, Plus, Pin, Trash2, Search, StickyNote, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import RichTextEditor from "@/components/RichTextEditor";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";

const htmlToMarkdown = (html: string): string => {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<li><p>(.*?)<\/p><\/li>/gi, "- $1\n");
  md = md.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<ul[^>]*>/gi, "\n");
  md = md.replace(/<\/ul>/gi, "\n");
  md = md.replace(/<ol[^>]*>/gi, "\n");
  md = md.replace(/<\/ol>/gi, "\n");
  md = md.replace(/<p>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]*>/g, "");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
};

const NotesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotes(user.id);
      setNotes(data);
    } catch {
      toast.error(t("notes.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleCreate = async () => {
    if (!user) return;
    try {
      const note = await createNote(user.id, t("notes.untitled") + " Note", "");
      setNotes((prev) => [note, ...prev]);
      setActiveNote(note);
      setTitle(note.title);
      setContent(note.content);
    } catch {
      toast.error(t("notes.failedCreate"));
    }
  };

  const handleSave = useCallback(async () => {
    if (!activeNote) return;
    try {
      await updateNote(activeNote.id, { title, content });
      setNotes((prev) =>
        prev.map((n) => (n.id === activeNote.id ? { ...n, title, content, updatedAt: new Date() } : n))
      );
    } catch {
      toast.error(t("notes.failedSave"));
    }
  }, [activeNote, title, content]);

  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNote?.id === id) { setActiveNote(null); setTitle(""); setContent(""); }
    try {
      await deleteNote(id);
      toast.success(t("notes.deleted"));
    } catch {
      toast.error(t("notes.failedDelete"));
      loadNotes();
    }
  };

  const handleTogglePin = async (note: Note) => {
    const newPinned = !note.pinned;
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: newPinned } : n))
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt.getTime() - a.updatedAt.getTime())
    );
    try {
      await updateNote(note.id, { pinned: newPinned });
    } catch {
      toast.error(t("notes.failedUpdate"));
    }
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const md = `# ${title}\n\n${htmlToMarkdown(content)}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "Untitled"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("notes.exported"));
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "");

  const filtered = notes.filter((n) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return n.title.toLowerCase().includes(q) || stripHtml(n.content).toLowerCase().includes(q);
  });

  const selectNote = (note: Note) => {
    if (activeNote) handleSave();
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          <h1 className="font-display text-lg font-bold text-foreground">{t("notes.title")}</h1>
        </div>
        <QuickNavButton />
        <button onClick={handleCreate} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`w-full md:w-80 border-r border-border flex flex-col shrink-0 ${activeNote ? "hidden md:flex" : "flex"}`}>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                placeholder={t("notes.searchNotes")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <StickyNote className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{t("notes.noNotes")}</p>
              </div>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors ${
                    activeNote?.id === note.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {note.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{note.title || t("notes.untitled")}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{stripHtml(note.content).slice(0, 60) || t("notes.noContent")}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{format(note.updatedAt, "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className={`flex-1 flex flex-col ${!activeNote ? "hidden md:flex" : "flex"}`}>
          {activeNote ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                <button onClick={() => { handleSave(); setActiveNote(null); }} className="md:hidden p-2 rounded-lg hover:bg-accent">
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
                <div className="flex-1" />
                <button onClick={handleExportMarkdown} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title={t("notes.exportMarkdown")}>
                  <FileDown className="w-4 h-4" />
                </button>
                <button onClick={() => handleTogglePin(activeNote)} className={`p-2 rounded-lg transition-colors ${activeNote.pinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(activeNote.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleSave()}
                  placeholder={t("notes.titlePlaceholder")}
                  className="w-full text-2xl font-display font-bold text-foreground bg-transparent outline-none mb-4 placeholder:text-muted-foreground/40"
                />
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  onBlur={() => handleSave()}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("notes.selectNote")}</p>
              </div>
            </div>
          )}
        </main>
      </div>
      <ModuleSwitcher />
    </div>
  );
};

export default NotesPage;
