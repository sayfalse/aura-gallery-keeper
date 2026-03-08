import { X, ChevronLeft, ChevronRight, Heart, Download, Trash2, Info } from "lucide-react";
import type { Photo } from "@/types/photo";
import { format } from "date-fns";
import { useState } from "react";

interface LightboxProps {
  photo: Photo;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

const Lightbox = ({ photo, onClose, onPrev, onNext, onToggleFavorite, onDelete, hasPrev, hasNext }: LightboxProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="fixed inset-0 z-50 lightbox-overlay flex items-center justify-center animate-fade-in" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
          <X className="w-5 h-5 text-card" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(photo.id); }} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Heart className={`w-5 h-5 ${photo.favorite ? "fill-red-500 text-red-500" : "text-card"}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Info className="w-5 h-5 text-card" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Trash2 className="w-5 h-5 text-card" />
          </button>
        </div>
      </div>

      {/* Navigation - hidden on mobile (use swipe) */}
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20 items-center justify-center transition-colors z-10 hidden md:flex">
          <ChevronLeft className="w-6 h-6 text-card" />
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-card/10 hover:bg-card/20 items-center justify-center transition-colors z-10 hidden md:flex">
          <ChevronRight className="w-6 h-6 text-card" />
        </button>
      )}

      {/* Image */}
      <img
        src={photo.src}
        alt={photo.name}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Info panel */}
      {showInfo && (
        <div className="absolute right-0 bottom-0 left-0 md:left-auto md:top-0 w-full md:w-72 bg-card/95 backdrop-blur-xl p-6 pt-6 md:pt-20 rounded-t-2xl md:rounded-none animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-display font-semibold text-foreground text-lg">{photo.name}</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="text-foreground">{format(photo.date, "MMM d, yyyy")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="text-foreground">{photo.size}</span></div>
            {photo.album && <div className="flex justify-between"><span className="text-muted-foreground">Album</span><span className="text-foreground">{photo.album}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Lightbox;
