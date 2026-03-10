import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface WallpaperContextType {
  wallpaperUrl: string | null;
  wallpaperOpacity: number;
  wallpaperBlur: number;
  setWallpaper: (url: string | null) => void;
  setWallpaperOpacity: (opacity: number) => void;
  setWallpaperBlur: (blur: number) => void;
  clearWallpaper: () => void;
}

const WallpaperContext = createContext<WallpaperContextType>({
  wallpaperUrl: null,
  wallpaperOpacity: 0.35,
  wallpaperBlur: 0,
  setWallpaper: () => {},
  setWallpaperOpacity: () => {},
  setWallpaperBlur: () => {},
  clearWallpaper: () => {},
});

export const useWallpaper = () => useContext(WallpaperContext);

const STORAGE_KEY = "app_wallpaper";

interface StoredWallpaper {
  url: string;
  opacity: number;
  blur: number;
}

export const WallpaperProvider = ({ children }: { children: ReactNode }) => {
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperOpacity, setWallpaperOpacityState] = useState(0.35);
  const [wallpaperBlur, setWallpaperBlurState] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredWallpaper = JSON.parse(stored);
        setWallpaperUrl(parsed.url);
        setWallpaperOpacityState(parsed.opacity ?? 0.15);
        setWallpaperBlurState(parsed.blur ?? 0);
      }
    } catch {}
  }, []);

  const save = useCallback((url: string | null, opacity: number, blur: number) => {
    if (url) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, opacity, blur }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setWallpaper = useCallback((url: string | null) => {
    setWallpaperUrl(url);
    save(url, wallpaperOpacity, wallpaperBlur);
  }, [wallpaperOpacity, wallpaperBlur, save]);

  const setWallpaperOpacity = useCallback((opacity: number) => {
    setWallpaperOpacityState(opacity);
    save(wallpaperUrl, opacity, wallpaperBlur);
  }, [wallpaperUrl, wallpaperBlur, save]);

  const setWallpaperBlur = useCallback((blur: number) => {
    setWallpaperBlurState(blur);
    save(wallpaperUrl, wallpaperOpacity, blur);
  }, [wallpaperUrl, wallpaperOpacity, save]);

  const clearWallpaper = useCallback(() => {
    setWallpaperUrl(null);
    setWallpaperOpacityState(0.15);
    setWallpaperBlurState(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <WallpaperContext.Provider value={{
      wallpaperUrl,
      wallpaperOpacity,
      wallpaperBlur,
      setWallpaper,
      setWallpaperOpacity,
      setWallpaperBlur,
      clearWallpaper,
    }}>
      {/* Global wallpaper layer */}
      {wallpaperUrl && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url(${wallpaperUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: wallpaperOpacity,
            filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined,
          }}
        />
      )}
      <div className="relative z-[1]">
        {children}
      </div>
    </WallpaperContext.Provider>
  );
};
