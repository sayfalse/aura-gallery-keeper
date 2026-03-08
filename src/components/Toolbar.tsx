import { Search, LayoutGrid, List, CheckSquare, Trash2, X } from "lucide-react";
import type { ViewMode, SidebarSection } from "@/types/photo";
import ProfileMenu from "@/components/ProfileMenu";

interface ToolbarProps {
  section: SidebarSection;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

const sectionTitles: Record<SidebarSection, string> = {
  photos: "All Photos",
  favorites: "Favorites",
  albums: "Albums",
  recent: "Recent",
  trash: "Trash",
};

const Toolbar = ({
  section, viewMode, onViewModeChange, searchQuery, onSearchChange,
  selectionMode, onToggleSelectionMode, selectedCount, onDeleteSelected, onClearSelection,
}: ToolbarProps) => {
  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <h1 className="font-display text-lg md:text-2xl font-bold tracking-tight text-foreground shrink-0">
          {sectionTitles[section]}
        </h1>

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-2 w-32 md:w-52 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* View mode - hidden on small mobile */}
          <div className="hidden sm:flex items-center rounded-xl bg-secondary p-1">
            <button
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-card shadow-sm" : ""}`}
            >
              <LayoutGrid className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-card shadow-sm" : ""}`}
            >
              <List className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Selection */}
          <button
            onClick={onToggleSelectionMode}
            className={`p-2 rounded-xl transition-colors ${selectionMode ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-accent"}`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selection bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-primary/5 rounded-xl animate-slide-up">
          <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
          <div className="flex-1" />
          <button onClick={onDeleteSelected} className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={onClearSelection} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
