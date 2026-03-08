import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Heart, Check, GripVertical } from "lucide-react";
import type { Photo } from "@/types/photo";

interface SortablePhotoItemProps {
  photo: Photo;
  isSelected: boolean;
  selectionMode: boolean;
  isDraggable: boolean;
  onSelect: (id: string) => void;
  onOpen: (photo: Photo) => void;
  onToggleFavorite: (id: string) => void;
  animationDelay: number;
}

const SortablePhotoItem = ({
  photo,
  isSelected,
  selectionMode,
  isDraggable,
  onSelect,
  onOpen,
  onToggleFavorite,
  animationDelay,
}: SortablePhotoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${animationDelay}ms`,
    animationFillMode: "both" as const,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="photo-grid-item group relative aspect-square animate-slide-up"
      onClick={() => (selectionMode ? onSelect(photo.id) : onOpen(photo))}
    >
      <img
        src={photo.src}
        alt={photo.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors duration-200" />

      {/* Drag handle */}
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-card/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-foreground" />
        </button>
      )}

      {/* Selection checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(photo.id);
        }}
        className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? "bg-primary border-primary scale-100 opacity-100"
            : "border-card bg-card/60 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
        }`}
      >
        {isSelected && (
          <Check className="w-3.5 h-3.5 text-primary-foreground" />
        )}
      </button>

      {/* Favorite */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(photo.id);
        }}
        className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
          photo.favorite
            ? "opacity-100 scale-100"
            : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
        }`}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            photo.favorite
              ? "fill-red-500 text-red-500"
              : "text-card fill-card/40"
          }`}
        />
      </button>
    </div>
  );
};

export default SortablePhotoItem;
