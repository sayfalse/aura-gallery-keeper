import { useCallback, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import type { Photo } from "@/types/photo";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (photos: Photo[]) => void;
}

const UploadModal = ({ isOpen, onClose, onUpload }: UploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList) => {
    const newPhotos: Photo[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        src: URL.createObjectURL(file),
        name: file.name.replace(/\.[^/.]+$/, ""),
        date: new Date(),
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        favorite: false,
      }));
    if (newPhotos.length) {
      onUpload(newPhotos);
      onClose();
    }
  }, [onUpload, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lightbox-overlay flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-bold text-foreground">Upload Photos</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <p className="text-foreground font-medium mb-1">Drop photos here or click to browse</p>
          <p className="text-sm text-muted-foreground">Supports JPG, PNG, WebP, GIF</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
};

export default UploadModal;
