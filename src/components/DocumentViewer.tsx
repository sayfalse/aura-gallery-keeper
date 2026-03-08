import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Download, FileText, Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentViewerProps {
  fileName: string;
  storagePath: string;
  mimeType: string;
  onClose: () => void;
}

const DocumentViewer = ({ fileName, storagePath, mimeType, onClose }: DocumentViewerProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      try {
        // Create a signed URL for private files
        const { data, error } = await supabase.storage.from("drive").createSignedUrl(storagePath, 3600);
        if (error) throw error;
        setFileUrl(data.signedUrl);
      } catch {
        toast.error("Failed to load file");
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [storagePath]);

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage.from("drive").download(storagePath);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/") || fileName.endsWith(".mp4") || fileName.endsWith(".mov") || fileName.endsWith(".webm");
  const isOffice = mimeType.includes("word") || mimeType.includes("spreadsheet") || mimeType.includes("presentation") ||
    mimeType.includes("excel") || mimeType.includes("powerpoint") ||
    fileName.endsWith(".docx") || fileName.endsWith(".xlsx") || fileName.endsWith(".pptx") ||
    fileName.endsWith(".doc") || fileName.endsWith(".xls") || fileName.endsWith(".ppt");
  const isText = mimeType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv") || fileName.endsWith(".json");

  const getViewerContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-foreground font-medium">Unable to preview this file</p>
          <p className="text-sm text-muted-foreground mt-1">Try downloading it instead</p>
        </div>
      );
    }

    if (isPdf) {
      return (
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoom}`}
          className="flex-1 w-full border-0 bg-white rounded-lg"
          title={fileName}
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full rounded-lg shadow-lg transition-transform"
            style={{ transform: `scale(${zoom / 100})` }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="flex-1 flex items-center justify-center overflow-auto p-4 bg-black/90">
          <video
            src={fileUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (isOffice && fileUrl) {
      // Use Microsoft Office Online Viewer
      const encodedUrl = encodeURIComponent(fileUrl);
      return (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
          className="flex-1 w-full border-0 bg-white rounded-lg"
          title={fileName}
        />
      );
    }

    if (isText) {
      return <TextFileViewer url={fileUrl} />;
    }

    // Fallback: try to render in iframe
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-foreground font-medium text-lg">{fileName}</p>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Preview not available for this file type
        </p>
        <button onClick={handleDownload} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          <Download className="w-4 h-4 inline mr-1" />
          Download to View
        </button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[60] bg-background flex flex-col ${fullscreen ? "" : ""}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors shrink-0">
            <X className="w-5 h-5 text-foreground" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold text-foreground truncate">{fileName}</h1>
            <p className="text-[10px] text-muted-foreground">{mimeType}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-2 rounded-xl hover:bg-accent">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-xs text-muted-foreground min-w-[36px] text-center">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(300, zoom + 25))} className="p-2 rounded-xl hover:bg-accent">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleDownload} className="p-2 rounded-xl hover:bg-accent">
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content */}
      {getViewerContent()}
    </motion.div>
  );
};

// Text file viewer component
const TextFileViewer = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("Failed to load file content"))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <pre className="text-sm text-foreground font-mono whitespace-pre-wrap bg-secondary rounded-xl p-4 min-h-full">
        {content}
      </pre>
    </div>
  );
};

export default DocumentViewer;
