import { Images, Heart, Clock, Trash2, Upload, Share2 } from "lucide-react";
import type { SidebarSection } from "@/types/photo";

interface BottomNavProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onUpload: () => void;
}

const navItems: { id: SidebarSection; label: string; icon: React.ElementType }[] = [
  { id: "photos", label: "Photos", icon: Images },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "shared", label: "Shared", icon: Share2 },
  { id: "recent", label: "Recent", icon: Clock },
];

const BottomNav = ({ activeSection, onSectionChange, onUpload }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
              activeSection === item.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${activeSection === item.id ? "stroke-[2.5]" : ""}`} />
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        ))}
        <button
          onClick={onUpload}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-primary min-w-[56px]"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center -mt-1">
            <Upload className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-medium leading-tight">Upload</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
