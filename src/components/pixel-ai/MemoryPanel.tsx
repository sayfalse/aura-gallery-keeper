import { useState } from "react";
import { Brain, Trash2, Plus, X, Search } from "lucide-react";
import { AIMemory } from "@/lib/pixelAIService";

interface MemoryPanelProps {
  memories: AIMemory[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onAddMemory: (content: string, category: string) => void;
}

const CATEGORIES = [
  { value: "preference", label: "💡 Preference", color: "text-amber-500" },
  { value: "personal", label: "👤 Personal", color: "text-blue-500" },
  { value: "work", label: "💼 Work", color: "text-green-500" },
  { value: "interest", label: "❤️ Interest", color: "text-pink-500" },
  { value: "general", label: "📌 General", color: "text-muted-foreground" },
];

const MemoryPanel = ({ memories, onClose, onDelete, onClearAll, onAddMemory }: MemoryPanelProps) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [search, setSearch] = useState("");

  const filtered = memories.filter(m =>
    m.content.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!newContent.trim()) return;
    onAddMemory(newContent.trim(), newCategory);
    setNewContent("");
    setShowAdd(false);
  };

  const getCategoryInfo = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[4];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg bg-card rounded-t-3xl border-t border-border max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Memory 🧠</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{memories.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowAdd(!showAdd)} className="p-2 rounded-xl hover:bg-accent text-primary">
              <Plus className="w-4 h-4" />
            </button>
            {memories.length > 0 && (
              <button onClick={onClearAll} className="p-2 rounded-xl hover:bg-destructive/10 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="px-5 pb-3 space-y-2">
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Add a memory... (e.g., 'I prefer dark mode')"
              className="w-full p-3 rounded-xl bg-muted border-0 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setNewCategory(cat.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
                      newCategory === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <button onClick={handleAdd} disabled={!newContent.trim()} className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {memories.length > 3 && (
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search memories..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}

        {/* Memory list */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No memories yet 🧠</p>
              <p className="text-xs text-muted-foreground">Pixel learns from your conversations and saves important details here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(memory => {
                const catInfo = getCategoryInfo(memory.category);
                return (
                  <div key={memory.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 group">
                    <span className="text-sm mt-0.5">{catInfo.label.split(" ")[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{memory.content}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(memory.id)}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryPanel;
