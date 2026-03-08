import { useState, useMemo, useCallback, useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import PhotoGrid from "@/components/PhotoGrid";
import AlbumGrid from "@/components/AlbumGrid";
import Toolbar from "@/components/Toolbar";
import Lightbox from "@/components/Lightbox";
import UploadModal from "@/components/UploadModal";
import CreateAlbumModal from "@/components/CreateAlbumModal";
import AddToAlbumModal from "@/components/AddToAlbumModal";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPhotos, fetchDeletedPhotos, toggleFavorite as toggleFavApi, softDeletePhoto, uploadPhoto, restorePhoto, permanentlyDeletePhoto } from "@/lib/photoService";
import { fetchAlbums, createAlbum, deleteAlbum, addPhotosToAlbum, fetchAlbumPhotos, updateAlbumCover, reorderAlbumPhotos } from "@/lib/albumService";
import { fetchSharedWithMe, saveSharedPhoto, type SharedPhoto } from "@/lib/sharedPhotoService";
import type { Photo, Album, ViewMode, SidebarSection } from "@/types/photo";
import { toast } from "sonner";
import { ArrowLeft, Download, Share2 } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeSection, setActiveSection] = useState<SidebarSection>("photos");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [albumPhotoIds, setAlbumPhotoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([]);

  const loadPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const [active, deleted] = await Promise.all([
        fetchPhotos(user.id),
        fetchDeletedPhotos(user.id),
      ]);
      setPhotos(active);
      setDeletedPhotos(deleted);
    } catch {
      toast.error("Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAlbums = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchAlbums(user.id);
      setAlbums(data);
    } catch {
      toast.error("Failed to load albums");
    }
  }, [user]);

  const loadSharedPhotos = useCallback(async () => {
    if (!user) return;
    try {
      const shared = await fetchSharedWithMe(user.id);
      setSharedPhotos(shared);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => { loadPhotos(); loadAlbums(); loadSharedPhotos(); }, [loadPhotos, loadAlbums, loadSharedPhotos]);

  const loadAlbumPhotos = useCallback(async (albumId: string) => {
    try {
      const ids = await fetchAlbumPhotos(albumId);
      setAlbumPhotoIds(ids);
    } catch {
      toast.error("Failed to load album photos");
    }
  }, []);

  const filteredPhotos = useMemo(() => {
    // If viewing an album's photos, maintain album sort order
    if (activeAlbum) {
      const albumPhotos = albumPhotoIds
        .map((id) => photos.find((p) => p.id === id))
        .filter(Boolean) as Photo[];
      return albumPhotos;
    }
    let result = photos;
    if (activeSection === "favorites") result = result.filter((p) => p.favorite);
    if (activeSection === "recent") result = result.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
    if (activeSection === "trash") return deletedPhotos;
    if (activeSection === "shared") return sharedPhotos as unknown as Photo[];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.album?.toLowerCase().includes(q));
    }
    return result;
  }, [photos, activeSection, searchQuery, deletedPhotos, activeAlbum, albumPhotoIds, sharedPhotos]);

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

  const handleCreateAlbum = useCallback(async (name: string, description?: string) => {
    if (!user) return;
    try {
      const album = await createAlbum(user.id, name, description);
      setAlbums((prev) => [album, ...prev]);
      setShowCreateAlbum(false);
      toast.success(`Album "${name}" created!`);
    } catch {
      toast.error("Failed to create album");
    }
  }, [user]);

  const handleDeleteAlbum = useCallback(async (id: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAlbum(id);
      toast.success("Album deleted");
    } catch {
      toast.error("Failed to delete album");
      loadAlbums();
    }
  }, [loadAlbums]);

  const handleOpenAlbum = useCallback((album: Album) => {
    setActiveAlbum(album);
    loadAlbumPhotos(album.id);
  }, [loadAlbumPhotos]);

  const handleAddToAlbum = useCallback(async (albumId: string) => {
    const ids = Array.from(selectedPhotos);
    try {
      await addPhotosToAlbum(albumId, ids);
      // Set cover if album has none
      const album = albums.find((a) => a.id === albumId);
      if (album && !album.coverPhotoUrl && ids.length > 0) {
        await updateAlbumCover(albumId, ids[0]);
      }
      setShowAddToAlbum(false);
      setSelectedPhotos(new Set());
      setSelectionMode(false);
      loadAlbums();
      toast.success(`Added ${ids.length} photo(s) to album`);
    } catch {
      toast.error("Failed to add photos to album");
    }
  }, [selectedPhotos, albums, loadAlbums]);

  const handleSectionChange = useCallback((section: SidebarSection) => {
    setActiveSection(section);
    setActiveAlbum(null);
    setAlbumPhotoIds([]);
  }, []);

  const handleReorderPhotos = useCallback(async (orderedIds: string[]) => {
    if (!activeAlbum) return;
    // Optimistic update
    setAlbumPhotoIds(orderedIds);
    try {
      await reorderAlbumPhotos(activeAlbum.id, orderedIds);
    } catch {
      toast.error("Failed to save photo order");
      loadAlbumPhotos(activeAlbum.id);
    }
  }, [activeAlbum, loadAlbumPhotos]);

  const restoreSelected = useCallback(async () => {
    const toRestore = deletedPhotos.filter((p) => selectedPhotos.has(p.id));
    setDeletedPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    setPhotos((prev) => [...toRestore, ...prev]);
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    try {
      await Promise.all(toRestore.map((p) => restorePhoto(p.id)));
      toast.success(`${toRestore.length} photo(s) restored!`);
    } catch {
      toast.error("Failed to restore some photos");
      loadPhotos();
    }
  }, [selectedPhotos, deletedPhotos, loadPhotos]);

  const permanentDeleteSelected = useCallback(async () => {
    const toDelete = deletedPhotos.filter((p) => selectedPhotos.has(p.id));
    if (!confirm(`Permanently delete ${toDelete.length} photo(s)? This cannot be undone.`)) return;
    setDeletedPhotos((prev) => prev.filter((p) => !selectedPhotos.has(p.id)));
    setSelectedPhotos(new Set());
    setSelectionMode(false);
    try {
      await Promise.all(toDelete.map((p) => permanentlyDeletePhoto(p.id, p.storagePath || "")));
      toast.success(`${toDelete.length} photo(s) permanently deleted`);
    } catch {
      toast.error("Failed to delete some photos");
      loadPhotos();
    }
  }, [selectedPhotos, deletedPhotos, loadPhotos]);

  const lightboxIndex = lightboxPhoto ? filteredPhotos.findIndex((p) => p.id === lightboxPhoto.id) : -1;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showAlbumsList = activeSection === "albums" && !activeAlbum;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onUpload={() => setShowUpload(true)}
        photoCount={photos.length}
        favoriteCount={photos.filter((p) => p.favorite).length}
        sharedCount={sharedPhotos.length}
        onSignOut={signOut}
      />

      <BottomNav
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onUpload={() => setShowUpload(true)}
        sharedCount={sharedPhotos.length}
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
          onAddToAlbum={selectedPhotos.size > 0 && activeSection !== "trash" ? () => setShowAddToAlbum(true) : undefined}
          activeAlbum={activeAlbum}
          onBackFromAlbum={() => { setActiveAlbum(null); setAlbumPhotoIds([]); }}
          onRestoreSelected={activeSection === "trash" && selectedPhotos.size > 0 ? restoreSelected : undefined}
          onPermanentDeleteSelected={activeSection === "trash" && selectedPhotos.size > 0 ? permanentDeleteSelected : undefined}
        />

        <div className="p-3 md:p-6 pb-24 md:pb-6">
          {showAlbumsList ? (
            <AlbumGrid
              albums={albums}
              onOpenAlbum={handleOpenAlbum}
              onCreateAlbum={() => setShowCreateAlbum(true)}
              onDeleteAlbum={handleDeleteAlbum}
            />
          ) : (
            <PhotoGrid
              photos={filteredPhotos}
              selectedPhotos={selectedPhotos}
              onSelect={toggleSelect}
              onOpen={setLightboxPhoto}
              onToggleFavorite={handleToggleFavorite}
              selectionMode={selectionMode}
              isAlbumView={!!activeAlbum}
              onReorder={handleReorderPhotos}
            />
          )}
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

      <CreateAlbumModal
        isOpen={showCreateAlbum}
        onClose={() => setShowCreateAlbum(false)}
        onCreate={handleCreateAlbum}
      />

      <AddToAlbumModal
        isOpen={showAddToAlbum}
        onClose={() => setShowAddToAlbum(false)}
        albums={albums}
        onAddToAlbum={handleAddToAlbum}
        selectedCount={selectedPhotos.size}
      />
    </div>
  );
};

export default Index;
