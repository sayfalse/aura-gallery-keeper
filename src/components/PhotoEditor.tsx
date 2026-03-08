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

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
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

const CROP_PRESETS = [
  { label: "Free", ratio: 0 },
  { label: "1:1", ratio: 1 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
];

const PhotoEditor = ({ imageSrc, imageName, onClose, onSave }: PhotoEditorProps) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Crop
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [cropRatio, setCropRatio] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropDragging, setCropDragging] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; area: CropArea } | null>(null);

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

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Load image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = imageSrc;
  }, [imageSrc]);

  // Initialize crop area when switching to crop tool
  useEffect(() => {
    if (activeTool === "crop" && img && !cropArea) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const margin = 0.1;
      setCropArea({
        x: w * margin,
        y: h * margin,
        width: w * (1 - 2 * margin),
        height: h * (1 - 2 * margin),
      });
    }
  }, [activeTool, img]);

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

    // Draw crop overlay
    if (activeTool === "crop" && cropArea) {
      ctx.save();
      // Dark overlay outside crop area
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Clear crop area
      ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      // Redraw image in crop area
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      ctx.clip();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${FILTERS[activeFilter].css}`;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
      // Draw text/paths in crop area
      ctx.save();
      ctx.beginPath();
      ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      ctx.clip();
      textOverlays.forEach((t) => {
        ctx.font = `${t.fontSize}px ${t.fontFamily}`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      });
      drawPaths.forEach((path) => {
        if (path.points.length < 2) return;
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      });
      ctx.restore();

      // Crop border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
      // Grid lines (rule of thirds)
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const xLine = cropArea.x + (cropArea.width * i) / 3;
        const yLine = cropArea.y + (cropArea.height * i) / 3;
        ctx.beginPath(); ctx.moveTo(xLine, cropArea.y); ctx.lineTo(xLine, cropArea.y + cropArea.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cropArea.x, yLine); ctx.lineTo(cropArea.x + cropArea.width, yLine); ctx.stroke();
      }
      // Corner handles
      const hs = 12;
      ctx.fillStyle = "#ffffff";
      const corners = [
        [cropArea.x, cropArea.y],
        [cropArea.x + cropArea.width, cropArea.y],
        [cropArea.x, cropArea.y + cropArea.height],
        [cropArea.x + cropArea.width, cropArea.y + cropArea.height],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
      });
      ctx.restore();
    }
  }, [img, brightness, contrast, saturation, rotation, flipH, flipV, activeFilter, textOverlays, drawPaths, activeTool, cropArea]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  // Canvas coordinate helper
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

  // Crop handlers
  const getCropHandle = (x: number, y: number): string | null => {
    if (!cropArea) return null;
    const hs = 20; // hit area
    const { x: cx, y: cy, width: cw, height: ch } = cropArea;
    if (Math.abs(x - cx) < hs && Math.abs(y - cy) < hs) return "tl";
    if (Math.abs(x - (cx + cw)) < hs && Math.abs(y - cy) < hs) return "tr";
    if (Math.abs(x - cx) < hs && Math.abs(y - (cy + ch)) < hs) return "bl";
    if (Math.abs(x - (cx + cw)) < hs && Math.abs(y - (cy + ch)) < hs) return "br";
    // Edges
    if (x > cx + hs && x < cx + cw - hs && Math.abs(y - cy) < hs) return "t";
    if (x > cx + hs && x < cx + cw - hs && Math.abs(y - (cy + ch)) < hs) return "b";
    if (y > cy + hs && y < cy + ch - hs && Math.abs(x - cx) < hs) return "l";
    if (y > cy + hs && y < cy + ch - hs && Math.abs(x - (cx + cw)) < hs) return "r";
    // Inside = move
    if (x > cx && x < cx + cw && y > cy && y < cy + ch) return "move";
    return null;
  };

  const handleCanvasPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "crop" && cropArea) {
      e.preventDefault();
      const handle = getCropHandle(coords.x, coords.y);
      if (handle) {
        setCropDragging(handle);
        setCropDragStart({ x: coords.x, y: coords.y, area: { ...cropArea } });
        return;
      }
    }

    if (activeTool === "draw") {
      e.preventDefault();
      setIsDrawing(true);
      setCurrentPath([coords]);
    }
  };

  const handleCanvasPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "crop" && cropDragging && cropDragStart && cropArea) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dx = coords.x - cropDragStart.x;
      const dy = coords.y - cropDragStart.y;
      const orig = cropDragStart.area;
      let newArea = { ...cropArea };

      if (cropDragging === "move") {
        newArea.x = Math.max(0, Math.min(canvas.width - orig.width, orig.x + dx));
        newArea.y = Math.max(0, Math.min(canvas.height - orig.height, orig.y + dy));
      } else {
        // Resize handles
        if (cropDragging.includes("l")) {
          const newX = Math.max(0, Math.min(orig.x + orig.width - 50, orig.x + dx));
          newArea.width = orig.width - (newX - orig.x);
          newArea.x = newX;
        }
        if (cropDragging.includes("r")) {
          newArea.width = Math.max(50, Math.min(canvas.width - orig.x, orig.width + dx));
        }
        if (cropDragging.includes("t")) {
          const newY = Math.max(0, Math.min(orig.y + orig.height - 50, orig.y + dy));
          newArea.height = orig.height - (newY - orig.y);
          newArea.y = newY;
        }
        if (cropDragging.includes("b")) {
          newArea.height = Math.max(50, Math.min(canvas.height - orig.y, orig.height + dy));
        }

        // Enforce aspect ratio
        if (cropRatio > 0) {
          if (cropDragging.includes("r") || cropDragging.includes("l")) {
            newArea.height = newArea.width / cropRatio;
          } else {
            newArea.width = newArea.height * cropRatio;
          }
          // Clamp
          if (newArea.x + newArea.width > canvas.width) newArea.width = canvas.width - newArea.x;
          if (newArea.y + newArea.height > canvas.height) newArea.height = canvas.height - newArea.y;
        }
      }
      setCropArea(newArea);
      return;
    }

    if (isDrawing && activeTool === "draw") {
      e.preventDefault();
      setCurrentPath((prev) => [...prev, coords]);
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
    }
  };

  const handleCanvasPointerUp = () => {
    if (cropDragging) {
      setCropDragging(null);
      setCropDragStart(null);
      return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      if (currentPath.length > 0) {
        setDrawPaths((prev) => [...prev, { points: currentPath, color: drawColor, size: drawSize }]);
        setCurrentPath([]);
      }
    }
  };

  const applyCrop = () => {
    if (!cropArea || !canvasRef.current || !img) return;
    const canvas = canvasRef.current;
    
    // Create a temp canvas with current rendered content (without crop overlay)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d")!;
    
    // Render without crop overlay
    tempCtx.save();
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((rotation * Math.PI) / 180);
    tempCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    tempCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${FILTERS[activeFilter].css}`;
    tempCtx.drawImage(img, -img.width / 2, -img.height / 2);
    tempCtx.restore();
    textOverlays.forEach((t) => {
      tempCtx.font = `${t.fontSize}px ${t.fontFamily}`;
      tempCtx.fillStyle = t.color;
      tempCtx.shadowColor = "rgba(0,0,0,0.5)";
      tempCtx.shadowBlur = 4;
      tempCtx.fillText(t.text, t.x, t.y);
    });
    drawPaths.forEach((path) => {
      if (path.points.length < 2) return;
      tempCtx.strokeStyle = path.color;
      tempCtx.lineWidth = path.size;
      tempCtx.lineCap = "round";
      tempCtx.lineJoin = "round";
      tempCtx.beginPath();
      tempCtx.moveTo(path.points[0].x, path.points[0].y);
      path.points.forEach((p) => tempCtx.lineTo(p.x, p.y));
      tempCtx.stroke();
    });

    // Get cropped image data
    const croppedData = tempCtx.getImageData(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Create new image from cropped data
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropArea.width;
    cropCanvas.height = cropArea.height;
    cropCanvas.getContext("2d")!.putImageData(croppedData, 0, 0);
    
    const newImg = new Image();
    newImg.crossOrigin = "anonymous";
    newImg.onload = () => {
      setImg(newImg);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setActiveFilter(0);
      setTextOverlays([]);
      setDrawPaths([]);
      setCropArea(null);
      setActiveTool("adjust");
      toast.success("Crop applied!");
    };
    newImg.src = cropCanvas.toDataURL("image/png");
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
    // Temporarily disable crop overlay for save
    const prevTool = activeTool;
    setActiveTool("adjust");
    setTimeout(() => {
      renderCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      onSave?.(dataUrl);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `edited_${imageName}`;
      a.click();
      toast.success("Photo saved!");
      setActiveTool(prevTool);
    }, 50);
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
    setCropArea(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImg(image);
    image.src = imageSrc;
  };

  const tools: { id: Tool; label: string; icon: React.ElementType }[] = [
    { id: "adjust", label: "Adjust", icon: Sun },
    { id: "filters", label: "Filters", icon: Palette },
    { id: "crop", label: "Crop", icon: Crop },
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
          onMouseDown={handleCanvasPointerDown}
          onMouseMove={handleCanvasPointerMove}
          onMouseUp={handleCanvasPointerUp}
          onMouseLeave={handleCanvasPointerUp}
          onTouchStart={handleCanvasPointerDown}
          onTouchMove={handleCanvasPointerMove}
          onTouchEnd={handleCanvasPointerUp}
        />
      </div>

      {/* Tool selector */}
      <div className="flex items-center justify-center gap-1 px-4 py-2 bg-card border-t border-border shrink-0 overflow-x-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.id !== "crop") setCropArea(null);
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] ${
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
                  type="range" min={0} max={200} value={s.value}
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
                    <img src={imageSrc} alt="" className="w-full h-full object-cover" style={{ filter: f.css || "none" }} />
                  )}
                </div>
                <span className="text-[10px] text-foreground font-medium">{f.name}</span>
              </button>
            ))}
          </div>
        )}

        {activeTool === "crop" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {CROP_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    setCropRatio(p.ratio);
                    if (p.ratio > 0 && cropArea && canvasRef.current) {
                      const canvas = canvasRef.current;
                      const maxW = canvas.width * 0.8;
                      const maxH = canvas.height * 0.8;
                      let w = maxW;
                      let h = w / p.ratio;
                      if (h > maxH) { h = maxH; w = h * p.ratio; }
                      setCropArea({
                        x: (canvas.width - w) / 2,
                        y: (canvas.height - h) / 2,
                        width: w,
                        height: h,
                      });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    cropRatio === p.ratio ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={applyCrop}
              disabled={!cropArea}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Apply Crop
            </button>
            <p className="text-[11px] text-muted-foreground text-center">Drag corners or edges to adjust the crop area</p>
          </div>
        )}

        {activeTool === "text" && (
          <div className="space-y-3">
            <input
              type="text" value={currentText} onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3 py-2 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer" />
              <input type="range" min={12} max={120} value={textSize} onChange={(e) => setTextSize(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary bg-secondary appearance-none rounded-full" />
              <span className="text-xs text-muted-foreground w-8">{textSize}</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {FONTS.map((f) => (
                <button key={f} onClick={() => setTextFont(f)}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors ${textFont === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
                  style={{ fontFamily: f }}>{f.split(" ")[0]}</button>
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
                  <button key={c} onClick={() => setDrawColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${drawColor === c ? "border-primary" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Size</span>
              <input type="range" min={1} max={20} value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary bg-secondary appearance-none rounded-full" />
              <span className="text-xs text-foreground w-6">{drawSize}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDrawPaths([])}
                className="flex-1 py-2 rounded-xl bg-secondary text-sm text-foreground flex items-center justify-center gap-1">
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
                <button key={preset} onClick={() => setAiPrompt(preset)}
                  className="px-2.5 py-1 rounded-lg bg-secondary text-xs text-foreground hover:bg-accent transition-colors">{preset}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe the edit..."
                className="flex-1 px-3 py-2.5 rounded-xl bg-secondary text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => e.key === "Enter" && handleAiEdit()} />
              <button onClick={handleAiEdit} disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
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
