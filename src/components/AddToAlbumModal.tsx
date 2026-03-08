import { useState } from "react";
import { X, Check } from "lucide-react";
import type { Album } from "@/types/photo";

interface AddToAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  albums: Album[];
  onAddToAlbum: (albumId: string) => void;
  selectedCount: number;
}

const AddToAlbumModal = ({ isOpen, onClose, albums, onAddToAlbum, selectedCount }: AddToAlbumModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lightbox-overlay flex items-center justify-center animate-fade-in px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            Add {selectedCount} photo{selectedCount !== 1 ? "s" : ""} to album
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {albums.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No albums yet. Create one first!</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => onAddToAlbum(album.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                {album.coverPhotoUrl ? (
                  <img src={album.coverPhotoUrl} alt={album.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{album.photoCount}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{album.name}</p>
                  <p className="text-xs text-muted-foreground">{album.photoCount} photos</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToAlbumModal;
