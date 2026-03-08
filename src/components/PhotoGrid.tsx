import { Heart, Check } from "lucide-react";
import type { Photo } from "@/types/photo";
import { format } from "date-fns";

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onSelect: (id: string) => void;
  onOpen: (photo: Photo) => void;
  onToggleFavorite: (id: string) => void;
  selectionMode: boolean;
}

const PhotoGrid = ({ photos, selectedPhotos, onSelect, onOpen, onToggleFavorite, selectionMode }: PhotoGridProps) => {
  // Group by date
  const grouped = photos.reduce<Record<string, Photo[]>>((acc, photo) => {
    const key = format(photo.date, "MMMM d, yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Heart className="w-8 h-8" />
        </div>
        <p className="text-lg font-display font-medium">No photos here yet</p>
        <p className="text-sm mt-1">Upload some photos to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {Object.entries(grouped).map(([date, datePhotos]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">{date}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 md:gap-2">
            {datePhotos.map((photo, i) => (
              <div
                key={photo.id}
                className="photo-grid-item group relative aspect-square animate-slide-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                onClick={() => selectionMode ? onSelect(photo.id) : onOpen(photo)}
              >
                <img
                  src={photo.src}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-200" />
                
                {/* Selection checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(photo.id); }}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    selectedPhotos.has(photo.id)
                      ? "bg-primary border-primary scale-100 opacity-100"
                      : "border-card bg-card/60 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                  }`}
                >
                  {selectedPhotos.has(photo.id) && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                </button>

                {/* Favorite */}
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(photo.id); }}
                  className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    photo.favorite
                      ? "opacity-100 scale-100"
                      : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      photo.favorite ? "fill-red-500 text-red-500" : "text-card fill-card/40"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid;
