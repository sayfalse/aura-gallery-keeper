import { useState } from "react";
import { Plus, FolderOpen, Trash2, MoreHorizontal, Image as ImageIcon } from "lucide-react";
import type { Album } from "@/types/photo";

interface AlbumGridProps {
  albums: Album[];
  onOpenAlbum: (album: Album) => void;
  onCreateAlbum: () => void;
  onDeleteAlbum: (id: string) => void;
}

const AlbumGrid = ({ albums, onOpenAlbum, onCreateAlbum, onDeleteAlbum }: AlbumGridProps) => {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Create album card */}
        <button
          onClick={onCreateAlbum}
          className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">New Album</span>
        </button>

        {/* Album cards */}
        {albums.map((album) => (
          <div
            key={album.id}
            className="relative group cursor-pointer"
            onClick={() => onOpenAlbum(album)}
          >
            <div className="aspect-square rounded-2xl overflow-hidden bg-secondary">
              {album.coverPhotoUrl ? (
                <img src={album.coverPhotoUrl} alt={album.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="w-10 h-10 text-muted-foreground/40" />
                </div>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent rounded-2xl" />
            </div>

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-sm font-semibold text-card truncate">{album.name}</p>
              <p className="text-xs text-card/70">{album.photoCount} photo{album.photoCount !== 1 ? "s" : ""}</p>
            </div>

            {/* Menu */}
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === album.id ? null : album.id); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4 text-card" />
            </button>

            {menuOpen === album.id && (
              <div className="absolute top-10 right-2 bg-card rounded-xl shadow-lg border border-border p-1 z-10 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { onDeleteAlbum(album.id); setMenuOpen(null); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/5 rounded-lg w-full transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {albums.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-display font-medium">No albums yet</p>
          <p className="text-sm mt-1">Create your first album to organize photos</p>
        </div>
      )}
    </div>
  );
};

export default AlbumGrid;
