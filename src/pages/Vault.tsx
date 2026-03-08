import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Plus, FileText, Image, Film, Music, File, Trash2, Download, ArrowLeft, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  hasVaultPin, setVaultPin, verifyVaultPin,
  listVaultFiles, uploadVaultFile, downloadVaultFile, deleteVaultFile,
  type VaultFile
} from "@/lib/vaultService";

// ─── PIN Pad ───

const PinPad = ({ onSubmit, mode }: { onSubmit: (pin: string) => void; mode: "unlock" | "setup" | "confirm" }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const maxLen = 4;

  const titles = { unlock: "Enter Vault PIN", setup: "Create Vault PIN", confirm: "Confirm PIN" };
  const subtitles = { unlock: "Enter your 4-digit PIN to access", setup: "Choose a 4-digit PIN", confirm: "Re-enter your PIN to confirm" };

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= maxLen) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === maxLen) {
      setTimeout(() => onSubmit(next), 150);
    }
  }, [pin, onSubmit]);

  const handleDelete = () => { setPin(p => p.slice(0, -1)); setError(false); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleDelete();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleDigit]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25">
          <KeyRound className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-1">{titles[mode]}</h1>
        <p className="text-sm text-muted-foreground mb-8">{subtitles[mode]}</p>

        <div className="flex gap-4 mb-10">
          {Array.from({ length: maxLen }).map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${error ? "bg-destructive animate-pulse" : i < pin.length ? "bg-primary scale-110" : "bg-border"}`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-[260px]">
          {digits.map((d, i) =>
            d === "" ? <div key={i} /> :
            d === "⌫" ? (
              <button key={i} onClick={handleDelete} className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors text-lg">⌫</button>
            ) : (
              <button key={i} onClick={() => handleDigit(d)} className="h-16 rounded-2xl bg-secondary hover:bg-accent transition-colors flex items-center justify-center text-xl font-semibold text-foreground active:scale-95">{d}</button>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── File icon helper ───

const getFileIcon = (mime: string | null) => {
  if (!mime) return File;
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("audio/")) return Music;
  if (mime.includes("pdf") || mime.includes("text")) return FileText;
  return File;
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Main Vault Page ───

const Vault = () => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [setupStep, setSetupStep] = useState<"setup" | "confirm" | null>(null);
  const [pendingPin, setPendingPin] = useState("");
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const needsSetup = !hasVaultPin();

  const loadFiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setFiles(await listVaultFiles(user.id));
    } catch { toast.error("Failed to load vault files"); }
    setLoading(false);
  }, [user]);

  useEffect(() => { if (unlocked) loadFiles(); }, [unlocked, loadFiles]);

  // ─── PIN flows ───

  const handleUnlock = async (pin: string) => {
    if (await verifyVaultPin(pin)) {
      setCurrentPin(pin);
      setUnlocked(true);
    } else {
      toast.error("Wrong PIN");
    }
  };

  const handleSetup = (pin: string) => {
    setPendingPin(pin);
    setSetupStep("confirm");
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== pendingPin) {
      toast.error("PINs don't match, try again");
      setSetupStep("setup");
      setPendingPin("");
      return;
    }
    await setVaultPin(pin);
    setCurrentPin(pin);
    setUnlocked(true);
    toast.success("Vault PIN created!");
  };

  // ─── If not unlocked, show PIN pad ───

  if (!unlocked) {
    if (needsSetup) {
      if (setupStep === "confirm") return <PinPad mode="confirm" onSubmit={handleConfirm} />;
      return <PinPad mode="setup" onSubmit={handleSetup} />;
    }
    return <PinPad mode="unlock" onSubmit={handleUnlock} />;
  }

  // ─── File actions ───

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length || !user) return;
    setUploading(true);
    try {
      for (const f of Array.from(fileList)) {
        await uploadVaultFile(user.id, f, currentPin);
      }
      toast.success(`${fileList.length} file(s) encrypted & stored`);
      await loadFiles();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDownload = async (file: VaultFile) => {
    try {
      const blob = await downloadVaultFile(file, currentPin);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File decrypted & downloaded");
    } catch {
      toast.error("Failed to decrypt file");
    }
  };

  const handleDelete = async (file: VaultFile) => {
    try {
      await deleteVaultFile(file);
      setFiles(f => f.filter(x => x.id !== file.id));
      toast.success("File removed from vault");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Lock className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">File Vault</h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> AES-256 encrypted
              </p>
            </div>
          </div>
          <button
            onClick={() => { setUnlocked(false); setCurrentPin(""); }}
            className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground"
            title="Lock vault"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Upload bar */}
      <div className="px-4 py-3">
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus className="w-5 h-5" />
          )}
          {uploading ? "Encrypting..." : "Add Files to Vault"}
        </button>
      </div>

      {/* File list */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Vault is empty</h3>
            <p className="text-sm text-muted-foreground max-w-[240px]">Files you add here are encrypted with your PIN before being stored.</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">{files.length} encrypted file{files.length !== 1 ? "s" : ""}</p>
            <AnimatePresence>
              {files.map((file, i) => {
                const Icon = getFileIcon(file.mime_type);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(file.size_bytes)} · {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleDownload(file)} className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(file)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vault;
