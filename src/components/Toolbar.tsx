import { Search, LayoutGrid, List, CheckSquare, Trash2, X, FolderPlus, ArrowLeft, RotateCcw, AlertTriangle } from "lucide-react";
import type { ViewMode, SidebarSection, Album } from "@/types/photo";
import ProfileMenu from "@/components/ProfileMenu";
import QuickNavButton from "@/components/QuickNavButton";

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
  onAddToAlbum?: () => void;
  activeAlbum?: Album | null;
  onBackFromAlbum?: () => void;
  onRestoreSelected?: () => void;
  onPermanentDeleteSelected?: () => void;
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
  onAddToAlbum, activeAlbum, onBackFromAlbum, onRestoreSelected, onPermanentDeleteSelected,
}: ToolbarProps) => {
  const title = activeAlbum ? activeAlbum.name : sectionTitles[section];
  const isTrash = section === "trash";

  return (
    <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          {activeAlbum && onBackFromAlbum && (
            <button onClick={onBackFromAlbum} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          <h1 className="font-display text-lg md:text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {isTrash && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              Cloud backed up
            </span>
          )}
        </div>

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

          {/* Quick Nav */}
          <QuickNavButton />
          {/* Profile */}
          <ProfileMenu />
        </div>
      </div>

      {/* Selection bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 mt-3 px-3 py-2 bg-primary/5 rounded-xl animate-slide-up">
          <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
          <div className="flex-1" />
          {isTrash ? (
            <>
              {onRestoreSelected && (
                <button onClick={onRestoreSelected} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              )}
              {onPermanentDeleteSelected && (
                <button onClick={onPermanentDeleteSelected} className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Delete Forever
                </button>
              )}
            </>
          ) : (
            <>
              {onAddToAlbum && (
                <button onClick={onAddToAlbum} className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" /> Add to Album
                </button>
              )}
              <button onClick={onDeleteSelected} className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </>
          )}
          <button onClick={onClearSelection} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
