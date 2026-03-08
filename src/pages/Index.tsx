import { useState, useMemo, useCallback } from "react";
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import PhotoGrid from "@/components/PhotoGrid";
import Toolbar from "@/components/Toolbar";
import Lightbox from "@/components/Lightbox";
import UploadModal from "@/components/UploadModal";
import { samplePhotos } from "@/data/samplePhotos";
import type { Photo, ViewMode, SidebarSection } from "@/types/photo";

const Index = () => {
  const [photos, setPhotos] = useState<Photo[]>(samplePhotos);
  const [activeSection, setActiveSection] = useState<SidebarSection>("photos");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (activeSection === "favorites") result = result.filter((p) => p.favorite);
    if (activeSection === "recent") result = result.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
    if (activeSection === "trash") return deletedPhotos;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.album?.toLowerCase().includes(q));
    }
    return result;
  }, [photos, activeSection, searchQuery, deletedPhotos]);

  const toggleFavorite = useCallback((id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    setPhotos((prev) => {
      const toDelete = prev.filter((p) => selectedPhotos.has(p.id));
      setDeletedPhotos((d) => [...d, ...toDelete]);
      return prev.filter((p) => !selectedPhotos.has(p.id));
    });
    setSelectedPhotos(new Set());
    setSelectionMode(false);
  }, [selectedPhotos]);

  const deletePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) setDeletedPhotos((d) => [...d, photo]);
      return prev.filter((p) => p.id !== id);
    });
    setLightboxPhoto(null);
  }, []);

  const handleUpload = useCallback((newPhotos: Photo[]) => {
    setPhotos((prev) => [...newPhotos, ...prev]);
  }, []);

  const lightboxIndex = lightboxPhoto ? filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id) : -1;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onUpload={() => setShowUpload(true)}
        photoCount={photos.length}
        favoriteCount={photos.filter((p) => p.favorite).length}
      />

      <main className="ml-[260px]">
        <Toolbar
          section={activeSection}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => { setSelectionMode(!selectionMode); setSelectedPhotos(new Set()); }}
          selectedCount={selectedPhotos.size}
          onDeleteSelected={deleteSelected}
          onClearSelection={() => { setSelectedPhotos(new Set()); setSelectionMode(false); }}
        />

        <div className="p-6">
          <PhotoGrid
            photos={filteredPhotos}
            selectedPhotos={selectedPhotos}
            onSelect={toggleSelect}
            onOpen={setLightboxPhoto}
            onToggleFavorite={toggleFavorite}
            selectionMode={selectionMode}
          />
        </div>
      </main>

      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onPrev={() => setLightboxPhoto(filteredPhotos[lightboxIndex - 1])}
          onNext={() => setLightboxPhoto(filteredPhotos[lightboxIndex + 1])}
          onToggleFavorite={toggleFavorite}
          onDelete={deletePhoto}
          hasPrev={lightboxIndex > 0}
          hasNext={lightboxIndex < filteredPhotos.length - 1}
        />
      )}

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default Index;
