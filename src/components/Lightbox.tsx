import { X, ChevronLeft, ChevronRight, Heart, Download, Trash2, Info, Calendar, HardDrive, ImageIcon, Clock, Share2, Check, MapPin, Maximize2, FileText, Camera, FolderOpen, Pencil } from "lucide-react";
import type { Photo } from "@/types/photo";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { createShareLink } from "@/lib/sharedPhotoService";
import { toast } from "sonner";
import PhotoEditor from "@/components/PhotoEditor";

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

interface ImageMeta {
  width: number;
  height: number;
  aspectRatio: string;
  megapixels: string;
}

const Lightbox = ({ photo, onClose, onPrev, onNext, onToggleFavorite, onDelete, hasPrev, hasNext }: LightboxProps) => {
  const { user } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Extract image dimensions when loaded
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const d = gcd(w, h);
      const mp = ((w * h) / 1_000_000).toFixed(1);
      setImageMeta({
        width: w,
        height: h,
        aspectRatio: `${w / d}:${h / d}`,
        megapixels: mp,
      });
    };
    img.src = photo.src;
  }, [photo.src]);

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
  const fullFileName = photo.name.includes(".") ? photo.name : `${photo.name}.jpg`;
  const mimeType = extension === "PNG" ? "image/png" : extension === "WEBP" ? "image/webp" : extension === "GIF" ? "image/gif" : "image/jpeg";

  // Determine time-based description
  const uploadDate = photo.date;
  const dayOfWeek = format(uploadDate, "EEEE");
  const timeAgo = (() => {
    const diff = Date.now() - uploadDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  })();

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
          <button onClick={(e) => { e.stopPropagation(); setShowEditor(true); }} className="w-10 h-10 rounded-full bg-card/10 hover:bg-card/20 flex items-center justify-center transition-colors">
            <Pencil className="w-5 h-5 text-card" />
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
        ref={imgRef}
        src={photo.src}
        alt={photo.name}
        className="max-w-[85vw] max-h-[85vh] object-contain rounded-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Google Photos / iOS style Info panel */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute right-0 bottom-0 left-0 md:left-auto md:top-0 w-full md:w-[340px] bg-card/95 backdrop-blur-2xl border-t md:border-l border-border rounded-t-3xl md:rounded-none overflow-y-auto max-h-[80vh] md:max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-2 md:hidden" />

            {/* Header section with thumbnail */}
            <div className="px-6 pt-4 md:pt-20 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-border">
                  <img src={photo.src} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-foreground text-base truncate">{fullFileName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo} · {dayOfWeek}</p>
                </div>
              </div>
            </div>

            {/* Details sections */}
            <div className="px-6 pb-6 space-y-1">

              {/* Date & Time — Primary */}
              <div className="py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{format(uploadDate, "EEEE, MMMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(uploadDate, "h:mm:ss a")}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Import date</p>
                  </div>
                </div>
              </div>

              {/* File Details */}
              <div className="py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">File Details</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">File name</span>
                        <span className="text-xs text-foreground font-medium truncate max-w-[160px]">{fullFileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Format</span>
                        <span className="text-xs text-foreground font-medium">{extension}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">MIME type</span>
                        <span className="text-xs text-foreground font-medium">{mimeType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">File size</span>
                        <span className="text-xs text-foreground font-medium">{photo.size || "Unknown"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Dimensions */}
              {imageMeta && (
                <div className="py-3 border-t border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Maximize2 className="w-[18px] h-[18px] text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">Dimensions</p>
                      <div className="mt-1.5 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Resolution</span>
                          <span className="text-xs text-foreground font-medium">{imageMeta.width} × {imageMeta.height}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Megapixels</span>
                          <span className="text-xs text-foreground font-medium">{imageMeta.megapixels} MP</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Aspect ratio</span>
                          <span className="text-xs text-foreground font-medium">{imageMeta.aspectRatio}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Camera / Device */}
              <div className="py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Camera className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Camera</p>
                    <p className="text-xs text-muted-foreground mt-1">Uploaded via Aura Cloud</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Device information not available</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Location</p>
                    <p className="text-xs text-muted-foreground mt-1">Location data not available</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">GPS coordinates not embedded in file</p>
                  </div>
                </div>
              </div>

              {/* Album */}
              {photo.album && (
                <div className="py-3 border-t border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FolderOpen className="w-[18px] h-[18px] text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">Album</p>
                      <p className="text-xs text-muted-foreground mt-1">{photo.album}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Storage & Status */}
              <div className="py-3 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <HardDrive className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">Storage</p>
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Backed up</span>
                        <span className="text-xs text-primary font-medium">✓ Cloud</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Favorite</span>
                        <span className="text-xs text-foreground font-medium">{photo.favorite ? "Yes ❤️" : "No"}</span>
                      </div>
                    </div>
                  </div>
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
