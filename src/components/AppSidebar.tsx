import { Images, Heart, FolderOpen, Clock, Trash2, Upload, Cloud, LogOut } from "lucide-react";
import type { SidebarSection } from "@/types/photo";

interface AppSidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onUpload: () => void;
  photoCount: number;
  favoriteCount: number;
  onSignOut?: () => void;
}

const navItems: { id: SidebarSection; label: string; icon: React.ElementType }[] = [
  { id: "photos", label: "All Photos", icon: Images },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "albums", label: "Albums", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "trash", label: "Trash", icon: Trash2 },
];

const AppSidebar = ({ activeSection, onSectionChange, onUpload, photoCount, favoriteCount, onSignOut }: AppSidebarProps) => {
  const getCount = (id: SidebarSection) => {
    if (id === "photos") return photoCount;
    if (id === "favorites") return favoriteCount;
    return undefined;
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border flex-col z-30 hidden md:flex">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Cloud className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-foreground">PixelVault</span>
      </div>

      {/* Upload */}
      <div className="px-4 mb-4">
        <button
          onClick={onUpload}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <Upload className="w-4 h-4" />
          Upload Photos
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const count = getCount(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`sidebar-nav-item w-full ${activeSection === item.id ? "active" : ""}`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {count !== undefined && (
                <span className="text-xs text-muted-foreground font-medium">{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Storage */}
      <div className="px-5 py-5 border-t border-sidebar-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Storage</span>
          <span>2.4 GB / 15 GB</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full w-[16%] rounded-full bg-primary transition-all duration-500" />
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
