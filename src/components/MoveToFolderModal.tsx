import { useState } from "react";
import { Folder, ChevronRight, Home, X } from "lucide-react";
import type { DriveFile } from "@/lib/driveService";

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: DriveFile | null;
  folders: string[];
  currentFolder: string;
  onMove: (file: DriveFile, targetFolder: string) => void;
}

const MoveToFolderModal = ({ isOpen, onClose, file, folders, currentFolder, onMove }: MoveToFolderModalProps) => {
  const [selectedFolder, setSelectedFolder] = useState("/");

  if (!isOpen || !file) return null;

  const availableFolders = folders.filter((f) => f !== currentFolder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Move "{file.name}"</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-60 overflow-y-auto space-y-1">
          {availableFolders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No other folders available. Create a folder first.</p>
          ) : (
            availableFolders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  selectedFolder === folder
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-accent/50 border border-transparent"
                }`}
              >
                {folder === "/" ? (
                  <Home className="w-5 h-5 text-primary/70 shrink-0" />
                ) : (
                  <Folder className="w-5 h-5 text-primary/70 shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate">
                  {folder === "/" ? "Root" : folder.split("/").filter(Boolean).pop()}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{folder}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onMove(file, selectedFolder); onClose(); }}
            disabled={availableFolders.length === 0}
            className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveToFolderModal;
