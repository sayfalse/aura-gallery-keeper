import { useState, useRef, useCallback } from "react";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { ImageIcon, Trash2, SlidersHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";

const PRESET_WALLPAPERS = [
  { name: "Gradient Blue", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%233b82f6'/%3E%3Cstop offset='100%25' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='400' height='400'/%3E%3C/svg%3E" },
  { name: "Gradient Purple", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%238b5cf6'/%3E%3Cstop offset='100%25' stop-color='%23ec4899'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='400' height='400'/%3E%3C/svg%3E" },
  { name: "Gradient Sunset", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f97316'/%3E%3Cstop offset='100%25' stop-color='%23ef4444'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='400' height='400'/%3E%3C/svg%3E" },
  { name: "Gradient Green", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2310b981'/%3E%3Cstop offset='100%25' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='400' height='400'/%3E%3C/svg%3E" },
  { name: "Dark Mesh", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3CradialGradient id='a' cx='20%25' cy='30%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%231e3a5f'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='80%25' cy='70%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%23312e81' stop-opacity='0.5'/%3E%3Cstop offset='100%25' stop-color='transparent'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='400' height='400'/%3E%3Crect fill='url(%23b)' width='400' height='400'/%3E%3C/svg%3E" },
  { name: "Warm Glow", url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3CradialGradient id='a' cx='50%25' cy='50%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%23fbbf24'/%3E%3Cstop offset='100%25' stop-color='%23b45309'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='400' height='400'/%3E%3C/svg%3E" },
];

const WallpaperSettings = () => {
  const { wallpaperUrl, wallpaperOpacity, wallpaperBlur, setWallpaper, setWallpaperOpacity, setWallpaperBlur, clearWallpaper } = useWallpaper();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showControls, setShowControls] = useState(!!wallpaperUrl);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setWallpaper(reader.result as string);
      setShowControls(true);
      toast.success("Wallpaper set!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [setWallpaper]);

  return (
    <section className="rounded-2xl bg-card border border-border p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <ImageIcon className="w-4 h-4" /> Wallpaper
      </h2>

      {/* Current preview */}
      {wallpaperUrl && (
        <div className="relative mb-4 rounded-xl overflow-hidden h-32 border border-border">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${wallpaperUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: wallpaperOpacity,
              filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
            }}
          />
          <div className="absolute inset-0 bg-background/50" />
          <div className="relative flex items-center justify-center h-full">
            <p className="text-xs font-medium text-foreground">Preview</p>
          </div>
        </div>
      )}

      {/* Upload button */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-sm font-medium text-muted-foreground hover:text-primary transition-all mb-4"
      >
        <Upload className="w-4 h-4" />
        Upload Custom Wallpaper
      </button>

      {/* Presets */}
      <p className="text-xs text-muted-foreground mb-2">Or choose a preset:</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {PRESET_WALLPAPERS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              setWallpaper(preset.url);
              setShowControls(true);
              toast.success(`Wallpaper: ${preset.name}`);
            }}
            className={`h-16 rounded-xl overflow-hidden border-2 transition-all ${
              wallpaperUrl === preset.url ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/30"
            }`}
          >
            <div
              className="w-full h-full"
              style={{ backgroundImage: `url(${preset.url})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          </button>
        ))}
      </div>

      {/* Controls */}
      {showControls && wallpaperUrl && (
        <div className="space-y-4 pt-3 border-t border-border">
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center gap-2 text-xs text-primary font-medium"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Settings
          </button>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Opacity</span>
              <span className="text-xs text-foreground font-medium">{Math.round(wallpaperOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.5"
              step="0.01"
              value={wallpaperOpacity}
              onChange={(e) => setWallpaperOpacity(parseFloat(e.target.value))}
              className="w-full h-2 bg-primary/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Blur</span>
              <span className="text-xs text-foreground font-medium">{wallpaperBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={wallpaperBlur}
              onChange={(e) => setWallpaperBlur(parseInt(e.target.value))}
              className="w-full h-2 bg-primary/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>

          <button
            onClick={() => {
              clearWallpaper();
              setShowControls(false);
              toast.success("Wallpaper removed");
            }}
            className="flex items-center gap-2 text-sm text-destructive font-medium hover:underline"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove Wallpaper
          </button>
        </div>
      )}
    </section>
  );
};

export default WallpaperSettings;
