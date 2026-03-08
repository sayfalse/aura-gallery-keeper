import { X, ChevronLeft, ChevronRight, Heart, Download, Trash2, Info, Calendar, HardDrive, ImageIcon, Clock, Share2, Link, Check } from "lucide-react";
import type { Photo } from "@/types/photo";
import { format } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { createShareLink } from "@/lib/sharedPhotoService";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShareLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const link = await createShareLink(user.id, "photo", photo.id);
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to create share link");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(photo.src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.name + (photo.name.includes(".") ? "" : ".jpg");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.src, "_blank");
    }
  };

  const extension = photo.name.includes(".") ? photo.name.split(".").pop()?.toUpperCase() : "JPG";

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
          <button onClick={handleDownload} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Download className="w-5 h-5 text-card" />
          </button>
          <button onClick={handleShareLink} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            {linkCopied ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5 text-card" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showInfo ? "bg-primary/30" : "bg-card/10 hover:bg-card/20"}`}>
            <Info className="w-5 h-5 text-card" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Trash2 className="w-5 h-5 text-card" />
          </button>
        </div>
      </div>

      {/* Navigation */}
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

      {/* Enhanced Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 bottom-0 left-0 md:left-auto md:top-0 w-full md:w-80 bg-card/95 backdrop-blur-2xl border-t md:border-l border-border p-6 pt-6 md:pt-20 rounded-t-3xl md:rounded-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4 md:hidden" />

            <h3 className="font-display font-semibold text-foreground text-lg truncate">{photo.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{extension} file</p>

            <div className="mt-5 space-y-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                  <p className="text-sm font-medium text-foreground">{format(photo.date, "MMMM d, yyyy")}</p>
                  <p className="text-xs text-muted-foreground">{format(photo.date, "h:mm a")}</p>
                </div>
              </div>

              {/* File Size */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="text-sm font-medium text-foreground">{photo.size || "Unknown"}</p>
                </div>
              </div>

              {/* Type */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm font-medium text-foreground">{extension} Image</p>
                </div>
              </div>

              {/* Album */}
              {photo.album && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Album</p>
                    <p className="text-sm font-medium text-foreground">{photo.album}</p>
                  </div>
                </div>
              )}

              {/* Favorite status */}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${photo.favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">
                    {photo.favorite ? "In your favorites" : "Not favorited"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Lightbox;
