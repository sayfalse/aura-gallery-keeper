import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchShareLinkData } from "@/lib/sharedPhotoService";
import { ArrowLeft, Download, Image, Images } from "lucide-react";

const SharedView = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    fetchShareLinkData(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = useCallback(async (src: string, name: string) => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Image className="w-12 h-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Link Not Available</h1>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (data?.type === "photo") {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground truncate">{data.data.name}</h1>
          </div>
          <button
            onClick={() => handleDownload(data.data.src, data.data.name)}
            className="p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <Download className="w-5 h-5 text-foreground" />
          </button>
        </header>
        <div className="flex items-center justify-center p-4 min-h-[80vh]">
          <img
            src={data.data.src}
            alt={data.data.name}
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-lg"
          />
        </div>
      </div>
    );
  }

  if (data?.type === "album") {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">{data.data.name}</h1>
            {data.data.description && (
              <p className="text-xs text-muted-foreground">{data.data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Images className="w-4 h-4" />
            <span className="text-xs">{data.data.photos.length}</span>
          </div>
        </header>

        <div className="p-3 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {data.data.photos.map((photo: any) => (
            <div
              key={photo.id}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img src={photo.src} alt={photo.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>

        {selectedPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setSelectedPhoto(null)}>
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(selectedPhoto.src, selectedPhoto.name); }}
              className="absolute top-4 right-4 p-3 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </button>
            <img
              src={selectedPhoto.src}
              alt={selectedPhoto.name}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default SharedView;
