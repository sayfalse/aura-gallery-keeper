import { useState, useMemo, useCallback, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import PhotoGrid from "@/components/PhotoGrid";
import Toolbar from "@/components/Toolbar";
import Lightbox from "@/components/Lightbox";
import UploadModal from "@/components/UploadModal";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPhotos, fetchDeletedPhotos, toggleFavorite as toggleFavApi, softDeletePhoto, uploadPhoto } from "@/lib/photoService";
import type { Photo, ViewMode, SidebarSection } from "@/types/photo";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);
  const [activeSection, setActiveSection] = useState<SidebarSection>("photos");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const [active, deleted] = await Promise.all([
        fetchPhotos(user.id),
        fetchDeletedPhotos(user.id),
      ]);
      setPhotos(active);
      setDeletedPhotos(deleted);
    } catch (err: any) {
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

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

  const handleToggleFavorite = useCallback(async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    const newFav = !photo.favorite;
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: newFav } : p)));
    try {
      await toggleFavApi(id, newFav);
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !newFav } : p)));
      toast.error("Failed to update favorite");
    }
  }, [photos]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(async () => {
    const toDelete = photos.filter((p) => selectedPhotos.has(p.id));
    setPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    setDeletedPhotos((prev) => [...toDelete, ...prev]);
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    try {
      await Promise.all(toDelete.map((p) => softDeletePhoto(p.id)));
    } catch {
      toast.error("Failed to delete some photos");
      loadPhotos();
    }
  }, [selectedPhotos, photos, loadPhotos]);

  const deletePhoto = useCallback(async (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setDeletedPhotos((prev) => [photo, ...prev]);
    setLightboxPhoto(null);
    try {
      await softDeletePhoto(id);
    } catch {
      toast.error("Failed to delete photo");
      loadPhotos();
    }
  }, [photos, loadPhotos]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!user) return;
    toast.info(`Uploading ${files.length} photo(s)...`);
    try {
      const uploaded = await Promise.all(files.map((f) => uploadPhoto(user.id, f)));
      setPhotos((prev) => [...uploaded, ...prev]);
      toast.success(`${uploaded.length} photo(s) uploaded!`);
    } catch {
      toast.error("Upload failed");
    }
  }, [user]);

  const lightboxIndex = lightboxPhoto ? filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id) : -1;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onUpload={() => setShowUpload(true)}
        photoCount={photos.length}
        favoriteCount={photos.filter((p) => p.favorite).length}
        onSignOut={signOut}
      />

      <BottomNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onUpload={() => setShowUpload(true)}
      />

      <main className="md:ml-[260px]">
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

        <div className="p-3 md:p-6 pb-24 md:pb-6">
          <PhotoGrid
            photos={filteredPhotos}
            selectedPhotos={selectedPhotos}
            onSelect={toggleSelect}
            onOpen={setLightboxPhoto}
            onToggleFavorite={handleToggleFavorite}
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
          onToggleFavorite={handleToggleFavorite}
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
