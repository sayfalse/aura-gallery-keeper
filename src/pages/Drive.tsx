import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fetchDriveFiles, uploadDriveFile, deleteDriveFile, downloadDriveFile, getDriveFolders, moveDriveFile, renameDriveFile, formatFileSize, type DriveFile } from "@/lib/driveService";
import { ArrowLeft, Upload, Trash2, Download, HardDrive, File, Image, FileText, Film, Music, Search, FolderPlus, Folder, ChevronRight, Home, FolderInput, Eye, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import MoveToFolderModal from "@/components/MoveToFolderModal";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import QuickNavButton from "@/components/QuickNavButton";
import DocumentViewer from "@/components/DocumentViewer";

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return File;
};

const DrivePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState("/");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [moveFile, setMoveFile] = useState<DriveFile | null>(null);
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, allFolders] = await Promise.all([
        fetchDriveFiles(user.id, currentFolder),
        getDriveFolders(user.id),
      ]);
      setFiles(data);
      setFolders(allFolders);
    } catch {
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [user, currentFolder]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const subfolders = folders.filter((f) => {
    if (f === currentFolder) return false;
    if (currentFolder === "/") {
      const parts = f.split("/").filter(Boolean);
      return parts.length === 1 && f !== "/";
    }
    const normalizedCurrent = currentFolder.endsWith("/") ? currentFolder : currentFolder + "/";
    return f.startsWith(normalizedCurrent) && f !== currentFolder && f.replace(normalizedCurrent, "").split("/").filter(Boolean).length === 1;
  });

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!user || !fileList.length) return;
    setUploading(true);
    try {
      const uploadedFiles = await Promise.all(
        Array.from(fileList).map((f) => uploadDriveFile(user.id, f, currentFolder))
      );
      setFiles((prev) => [...uploadedFiles, ...prev]);
      toast.success(`${uploadedFiles.length} file(s) uploaded!`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await uploadFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      const blob = await downloadDriveFile(file.storagePath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    try {
      await deleteDriveFile(file.id, file.storagePath);
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
      loadFiles();
    }
  };

  const handleMove = async (file: DriveFile, targetFolder: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    try {
      await moveDriveFile(file.id, targetFolder);
      toast.success(`Moved to ${targetFolder === "/" ? "Root" : targetFolder.split("/").filter(Boolean).pop()}`);
    } catch {
      toast.error("Failed to move file");
      loadFiles();
    }
  };

  const handleRename = async (file: DriveFile) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === file.name) {
      setRenamingId(null);
      return;
    }
    try {
      await renameDriveFile(file.id, trimmed);
      setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, name: trimmed } : f));
      toast.success("File renamed");
    } catch {
      toast.error("Rename failed");
    }
    setRenamingId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folderPath = currentFolder === "/" ? `/${newFolderName.trim()}` : `${currentFolder}/${newFolderName.trim()}`;
    if (!user) return;
    try {
      const placeholder = new Blob([""], { type: "text/plain" });
      const file = new globalThis.File([placeholder], ".folder", { type: "text/plain" });
      await uploadDriveFile(user.id, file, folderPath);
      setFolders((prev) => [...prev, folderPath].sort());
      setShowNewFolder(false);
      setNewFolderName("");
      toast.success("Folder created!");
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const navigateToFolder = (folder: string) => {
    setCurrentFolder(folder);
    setSearchQuery("");
  };

  const breadcrumbs = currentFolder === "/" ? ["/"] : ["/", ...currentFolder.split("/").filter(Boolean).reduce<string[]>((acc, part) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : "";
    acc.push(`${prev}/${part}`);
    return acc;
  }, [])];

  const filtered = files.filter((f) => {
    if (f.name === ".folder") return false;
    if (!searchQuery) return true;
    return f.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalSize = files.reduce((acc, f) => acc + f.sizeBytes, 0);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Upload className="w-12 h-12 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold text-primary">Drop files to upload</p>
          </div>
        </div>
      )}

      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg font-bold text-foreground">Drive</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {formatFileSize(totalSize)} used
          </span>
        </div>
        <QuickNavButton />
        <button onClick={() => setShowNewFolder(true)} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
          <FolderPlus className="w-5 h-5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          <Upload className="w-5 h-5" />
        </button>
        <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />
      </header>

      <div className="p-4 flex-1">
        <div className="flex items-center gap-1 mb-3 text-sm overflow-x-auto">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <button
                onClick={() => navigateToFolder(crumb)}
                className={`px-2 py-0.5 rounded-md transition-colors ${crumb === currentFolder ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                {crumb === "/" ? <Home className="w-4 h-4 inline" /> : crumb.split("/").filter(Boolean).pop()}
              </button>
            </div>
          ))}
        </div>

        {showNewFolder && (
          <div className="mb-4 p-3 rounded-xl bg-card border border-border flex items-center gap-2">
            <Folder className="w-5 h-5 text-muted-foreground shrink-0" />
            <input type="text" placeholder="Folder name..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} autoFocus className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            <button onClick={handleCreateFolder} className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} className="px-3 py-1 rounded-lg text-muted-foreground text-xs hover:bg-accent">Cancel</button>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {subfolders.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Folders</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subfolders.map((folder) => (
                    <button key={folder} onClick={() => navigateToFolder(folder)} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-accent/50 transition-all">
                      <Folder className="w-8 h-8 text-primary/70 shrink-0" />
                      <span className="text-sm font-medium text-foreground truncate">{folder.split("/").filter(Boolean).pop()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && subfolders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No files yet</p>
                <p className="text-xs mt-1">Upload files or drag & drop</p>
              </div>
            ) : filtered.length > 0 && (
              <div>
                {subfolders.length > 0 && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Files</p>}
                <div className="space-y-1">
                  {filtered.map((file) => {
                    const FileIcon = getFileIcon(file.mimeType);
                    const isRenaming = renamingId === file.id;
                    return (
                      <div key={file.id} onClick={() => !isRenaming && setPreviewFile(file)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <FileIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(file); if (e.key === "Escape") setRenamingId(null); }}
                                autoFocus
                                className="flex-1 px-2 py-1 rounded-lg bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button onClick={() => handleRename(file)} className="p-1 rounded-md hover:bg-accent text-primary"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setRenamingId(null)} className="p-1 rounded-md hover:bg-accent text-muted-foreground"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.sizeBytes)} · {format(file.createdAt, "MMM d, yyyy")} at {format(file.createdAt, "h:mm a")}
                              </p>
                            </>
                          )}
                        </div>
                        {!isRenaming && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setRenamingId(file.id); setRenameValue(file.name); }} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Rename">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPreviewFile(file)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Preview">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => setMoveFile(file)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Move">
                              <FolderInput className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDownload(file)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(file)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MoveToFolderModal isOpen={!!moveFile} onClose={() => setMoveFile(null)} file={moveFile} folders={folders} currentFolder={currentFolder} onMove={handleMove} />
      {previewFile && <DocumentViewer fileName={previewFile.name} storagePath={previewFile.storagePath} mimeType={previewFile.mimeType} onClose={() => setPreviewFile(null)} />}
      <ModuleSwitcher />
    </div>
  );
};

export default DrivePage;