import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, RotateCw, FlipHorizontal, FlipVertical, Sun, Contrast, Droplets,
  Type, Pencil, Eraser, Undo2, Redo2, Download, Check, Crop, Palette,
  Sparkles, Wand2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface PhotoEditorProps {
  imageSrc: string;
  imageName: string;
  onClose: () => void;
  onSave?: (dataUrl: string) => void;
}

type Tool = "adjust" | "filters" | "crop" | "text" | "draw" | "ai";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

const FILTERS = [
  { name: "Original", css: "" },
  { name: "Warm", css: "sepia(0.3) saturate(1.4) brightness(1.05)" },
  { name: "Cool", css: "saturate(0.8) hue-rotate(15deg) brightness(1.05)" },
  { name: "Vintage", css: "sepia(0.5) contrast(1.1) brightness(0.9) saturate(0.8)" },
  { name: "B&W", css: "grayscale(1)" },
  { name: "Dramatic", css: "contrast(1.4) brightness(0.9) saturate(1.2)" },
  { name: "Fade", css: "contrast(0.8) brightness(1.1) saturate(0.7)" },
  { name: "Vivid", css: "saturate(1.8) contrast(1.1) brightness(1.05)" },
  { name: "Noir", css: "grayscale(1) contrast(1.4) brightness(0.85)" },
  { name: "Sunset", css: "sepia(0.25) saturate(1.5) hue-rotate(-10deg) brightness(1.05)" },
  { name: "Arctic", css: "saturate(0.6) hue-rotate(30deg) brightness(1.15)" },
  { name: "Cinema", css: "contrast(1.2) saturate(0.85) brightness(0.95) sepia(0.15)" },
];

const FONTS = ["Arial", "Georgia", "Courier New", "Verdana", "Impact", "Comic Sans MS"];

const PhotoEditor = ({ imageSrc, imageName, onClose, onSave }: PhotoEditorProps) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<Tool>("adjust");
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  // Adjust values
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState(0);

  // Text
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("Text");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(32);
  const [textFont, setTextFont] = useState("Arial");

  // Draw
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#ff0000");
  const [drawSize, setDrawSize] = useState(4);
  const [drawPaths, setDrawPaths] = useState<{ points: { x: number; y: number }[]; color: string; size: number }[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Load image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      setImg(image);
    };
    image.src = imageSrc;
  }, [imageSrc]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !img) return;

    const isRotated = rotation % 180 !== 0;
    canvas.width = isRotated ? img.height : img.width;
    canvas.height = isRotated ? img.width : img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${FILTERS[activeFilter].css}`;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Draw text overlays
    textOverlays.forEach((t) => {
      ctx.save();
      ctx.font = `${t.fontSize}px ${t.fontFamily}`;
      ctx.fillStyle = t.color;
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    // Draw paths
    drawPaths.forEach((path) => {
      if (path.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    });
  }, [img, brightness, contrast, saturation, rotation, flipH, flipV, activeFilter, textOverlays, drawPaths]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // Drawing handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== "draw") return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setCurrentPath([coords]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool !== "draw") return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setCurrentPath((prev) => [...prev, coords]);

    // Draw current stroke live
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || currentPath.length < 1) return;
    const last = currentPath[currentPath.length - 1];
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handleDrawEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 0) {
      setDrawPaths((prev) => [...prev, { points: currentPath, color: drawColor, size: drawSize }]);
      setCurrentPath([]);
    }
  };

  const addTextOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: currentText,
        x: canvas.width / 4,
        y: canvas.height / 2,
        fontSize: textSize,
        color: textColor,
        fontFamily: textFont,
      },
    ]);
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() || !canvasRef.current || !user) return;
    setAiLoading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
      const { data, error } = await supabase.functions.invoke("ai-photo-edit", {
        body: { image: dataUrl, prompt: aiPrompt },
      });
      if (error) throw error;
      if (data?.editedImage) {
        const editedImg = new Image();
        editedImg.crossOrigin = "anonymous";
        editedImg.onload = () => {
          setImg(editedImg);
          toast.success("AI edit applied!");
        };
        editedImg.src = data.editedImage;
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || "AI edit failed");
    } finally {
      setAiLoading(false);
      setAiPrompt("");
    }
  };

  const handleUndo = () => {
    if (drawPaths.length > 0) {
      setDrawPaths((prev) => prev.slice(0, -1));
    } else if (textOverlays.length > 0) {
      setTextOverlays((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderCanvas();
    const dataUrl = canvas.toDataURL("image/png");
    onSave?.(dataUrl);

    // Download
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `edited_${imageName}`;
    a.click();
    toast.success("Photo saved!");
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setActiveFilter(0);
    setTextOverlays([]);
    setDrawPaths([]);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = imageSrc;
  };

  const tools: { id: Tool; label: string; icon: React.ElementType }[] = [
    { id: "adjust", label: "Adjust", icon: Sun },
    { id: "filters", label: "Filters", icon: Palette },
    { id: "text", label: "Text", icon: Type },
    { id: "draw", label: "Draw", icon: Pencil },
    { id: "ai", label: "AI Magic", icon: Sparkles },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-background flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <X className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-base font-bold text-foreground">Edit Photo</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} className="p-2 rounded-xl hover:bg-accent transition-colors">
            <Undo2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={handleReset} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Reset
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            <Download className="w-4 h-4 inline mr-1" />
            Save
          </button>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center bg-black/90 overflow-hidden p-4 min-h-0">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ touchAction: "none" }}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
        />
      </div>

      {/* Tool selector */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 bg-card border-t border-border shrink-0 overflow-x-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] ${
              activeTool === tool.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Tool panel */}
      <div className="bg-card border-t border-border px-4 py-4 shrink-0 max-h-[240px] overflow-y-auto">
        {activeTool === "adjust" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-muted-foreground shrink-0" />
              <button onClick={() => setRotation((r) => (r + 90) % 360)} className="px-3 py-1.5 rounded-lg bg-secondary text-xs text-foreground">Rotate 90°</button>
              <button onClick={() => setFlipH(!flipH)} className="p-1.5 rounded-lg bg-secondary">
                <FlipHorizontal className={`w-4 h-4 ${flipH ? "text-primary" : "text-muted-foreground"}`} />
              </button>
              <button onClick={() => setFlipV(!flipV)} className="p-1.5 rounded-lg bg-secondary">
                <FlipVertical className={`w-4 h-4 ${flipV ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            </div>
            {[
              { label: "Brightness", value: brightness, set: setBrightness, icon: Sun },
              { label: "Contrast", value: contrast, set: setContrast, icon: Contrast },
              { label: "Saturation", value: saturation, set: setSaturation, icon: Droplets },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <s.icon className="w-3.5 h-3.5" /> {s.label}
                  </span>
                  <span className="text-xs text-foreground font-medium">{s.value}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-primary bg-secondary appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}

        {activeTool === "filters" && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {FILTERS.map((f, i) => (
              <button
                key={f.name}
                onClick={() => setActiveFilter(i)}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
                  activeFilter === i ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary"
                }`}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                  {img && (
                    <img
                      src={imageSrc}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ filter: f.css || "none" }}
                    />
                  )}
                </div>
                <span className="text-[10px] text-foreground font-medium">{f.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeTool === "text" && (
          <div className="space-y-3">
            <input
              type="text"
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer" />
              <input
                type="range" min={12} max={120} value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary bg-secondary appearance-none rounded-full"
              />
              <span className="text-xs text-muted-foreground w-8">{textSize}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {FONTS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTextFont(f)}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${textFont === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
                  style={{ fontFamily: f }}
                >
                  {f.split(" ")[0]}
                </button>
              ))}
            </div>
            <button onClick={addTextOverlay} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              Add Text
            </button>
          </div>
        )}

        {activeTool === "draw" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Color</span>
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer" />
              <div className="flex gap-1">
                {["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000", "#ffff00", "#ff00ff"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${drawColor === c ? "border-primary" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Size</span>
              <input
                type="range" min={1} max={20} value={drawSize}
                onChange={(e) => setDrawSize(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary bg-secondary appearance-none rounded-full"
              />
              <span className="text-xs text-foreground w-6">{drawSize}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDrawPaths([])}
                className="flex-1 py-2 rounded-xl bg-secondary text-sm text-foreground flex items-center justify-center gap-1"
              >
                <Eraser className="w-4 h-4" /> Clear All
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Draw directly on the canvas above</p>
          </div>
        )}

        {activeTool === "ai" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">AI Magic Tools</span>
              </div>
              <p className="text-xs text-muted-foreground">Describe what you want to change — remove objects, enhance quality, change background, add effects, and more.</p>
            </div>
            <div className="flex gap-1 flex-wrap">
              {["Remove background", "Enhance quality", "Remove text", "Make brighter", "Add blur to background"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAiPrompt(preset)}
                  className="px-2.5 py-1 rounded-lg bg-secondary text-xs text-foreground hover:bg-accent transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the edit..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => e.key === "Enter" && handleAiEdit()}
              />
              <button
                onClick={handleAiEdit}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PhotoEditor;
