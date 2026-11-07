"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { DrawingSheet } from "@/data/drawings";
import { COLOR_PALETTES, ColorPalette } from "@/data/palettes";
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Palette,
  Check,
} from "@/components/ui/icons";

export type ToolType = "crayon" | "marker" | "pencil" | "eraser";

interface Point {
  x: number;
  y: number;
}

export interface StrokeEvent {
  points: Point[];
  color: string;
  size: number;
  tool: ToolType;
  opacity: number;
}

interface TactileCanvasProps {
  sheet: DrawingSheet;
  onStrokeRecorded?: (stroke: StrokeEvent) => void;
  externalStrokes?: StrokeEvent[];
  onCanvasExportReady?: (dataUrl: string) => void;
  className?: string;
  readOnly?: boolean;
}

export function TactileCanvas({
  sheet,
  onStrokeRecorded,
  externalStrokes,
  onCanvasExportReady,
  className = "",
  readOnly = false,
}: TactileCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineArtImageRef = useRef<HTMLImageElement | null>(null);

  // Tools & Styling
  const [currentTool, setCurrentTool] = useState<ToolType>("crayon");
  const [selectedColor, setSelectedColor] = useState<string>("#F4ACB7");
  const [brushSize, setBrushSize] = useState<number>(24);
  const [brushOpacity, setBrushOpacity] = useState<number>(0.85);
  const [activePaletteIndex, setActivePaletteIndex] = useState<number>(0);
  const [isCustomColorOpen, setIsCustomColorOpen] = useState<boolean>(false);

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const maxHistorySteps = 25;

  const CANVAS_DIMENSION = 800;

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_DIMENSION;
    canvas.height = CANVAS_DIMENSION;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Fill with pristine paper background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);

    // Initial snapshot for history
    const initialSnapshot = ctx.getImageData(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
    setHistory([initialSnapshot]);
    setHistoryIndex(0);
  }, [sheet.id]);

  // Handle external incoming strokes (for "Coloring Together" co-op mode)
  useEffect(() => {
    if (!externalStrokes || externalStrokes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lastStroke = externalStrokes[externalStrokes.length - 1];
    drawStrokeOnContext(ctx, lastStroke);
  }, [externalStrokes]);

  // Render a tactile, physics-based textured segment between two points
  const renderSegment = (
    ctx: CanvasRenderingContext2D,
    p1: Point,
    p2: Point,
    tool: ToolType,
    color: string,
    size: number,
    opacity: number
  ) => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    if (tool === "eraser") {
      ctx.strokeStyle = "#FAF8F5";
      ctx.fillStyle = "#FAF8F5";
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (tool === "crayon") {
      // 1. CRAYON: Authentic Waxy Pastel Tooth with scattered paper grain
      // Layer A: Semi-translucent soft waxy core
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size * 0.75;
      ctx.globalAlpha = opacity * 0.3;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Layer B: Dense waxy particle flecks catching the rough paper tooth
      const step = Math.max(2, size * 0.16);
      const steps = Math.max(1, Math.ceil(dist / step));
      const speckleCount = Math.max(6, Math.floor(size * 0.45));
      const radius = size * 0.52;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;

        for (let k = 0; k < speckleCount; k++) {
          const r = Math.pow(Math.random(), 0.62) * radius;
          const theta = Math.random() * Math.PI * 2;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          const speckleAlpha =
            (1 - (r / radius) * 0.35) * (0.35 + Math.random() * 0.55) * opacity;
          const dotDim = Math.random() * 1.8 + 0.9;

          ctx.globalAlpha = speckleAlpha;
          ctx.fillRect(px - dotDim / 2, py - dotDim / 2, dotDim, dotDim);
        }
      }
    } else if (tool === "marker") {
      // 2. MARKER: Fluid, saturated alcohol ink with subtle feathering bleed
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;

      // Layer A: Soft translucent outer bleed halo
      ctx.lineWidth = size * 1.18;
      ctx.globalAlpha = opacity * 0.18;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Layer B: Saturated fluid wet ink core
      ctx.lineWidth = size * 0.85;
      ctx.globalAlpha = opacity * 0.58;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (tool === "pencil") {
      // 3. PENCIL: Fine sharp colored pencil lead with micro graphite tooth
      const leadSize = Math.max(2, size * 0.28);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Sharp central lead stroke
      ctx.lineWidth = leadSize;
      ctx.globalAlpha = opacity * 0.88;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Fine powdery graphite dust along stroke path
      const steps = Math.max(1, Math.ceil(dist / 3.5));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;

        for (let k = 0; k < 2; k++) {
          const ox = cx + (Math.random() - 0.5) * (leadSize * 1.8);
          const oy = cy + (Math.random() - 0.5) * (leadSize * 1.8);
          ctx.globalAlpha = (0.25 + Math.random() * 0.35) * opacity;
          ctx.fillRect(ox, oy, 1.1, 1.1);
        }
      }
    }

    ctx.restore();
  };

  // Helper to render a dab on single tap
  const renderDab = (
    ctx: CanvasRenderingContext2D,
    point: Point,
    tool: ToolType,
    color: string,
    size: number,
    opacity: number
  ) => {
    renderSegment(
      ctx,
      point,
      { x: point.x + 0.1, y: point.y + 0.1 },
      tool,
      color,
      size,
      opacity
    );
  };

  // Helper to render a full stroke onto 2D context using tactile textures
  const drawStrokeOnContext = (ctx: CanvasRenderingContext2D, stroke: StrokeEvent) => {
    const { points, color, size, tool, opacity } = stroke;
    if (points.length === 0) return;

    if (points.length === 1) {
      renderDab(ctx, points[0], tool, color, size, opacity);
      return;
    }

    for (let i = 0; i < points.length - 1; i++) {
      renderSegment(ctx, points[i], points[i + 1], tool, color, size, opacity);
    }
  };

  // Export full merged canvas (Shading + Line Art Overlay)
  const exportMergedCanvas = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = CANVAS_DIMENSION;
    exportCanvas.height = CANVAS_DIMENSION;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return "";

    // 1. Draw colored canvas (paper + brush strokes)
    exportCtx.drawImage(canvas, 0, 0);

    // 2. Render authentic transparent black line-art on top
    if (lineArtImageRef.current) {
      exportCtx.drawImage(lineArtImageRef.current, 0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
    }

    const mergedUrl = exportCanvas.toDataURL("image/png");
    if (onCanvasExportReady) {
      onCanvasExportReady(mergedUrl);
    }
    return mergedUrl;
  }, [onCanvasExportReady]);

  // Preload authentic transparent line-art image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = sheet.imageUrl;
    img.onload = () => {
      lineArtImageRef.current = img;
      // Trigger initial export once image is loaded
      exportMergedCanvas();
    };
  }, [sheet.imageUrl, exportMergedCanvas]);

  // Save current canvas to history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      if (nextHistory.length >= maxHistorySteps) {
        nextHistory.shift();
      }
      return [...nextHistory, snapshot];
    });
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySteps - 1));

    // Also trigger export update if callback provided
    if (onCanvasExportReady) {
      exportMergedCanvas();
    }
  }, [historyIndex, onCanvasExportReady]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
    pushHistory();
  };

  // Convert Pointer coordinates to Canvas internal space (800x800)
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const scaleX = CANVAS_DIMENSION / rect.width;
    const scaleY = CANVAS_DIMENSION / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Pointer Down (Touch / Mouse / Stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    if (isPanMode || e.button === 1 || e.buttons === 4) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0 && e.pointerType === "mouse") return; // Only primary mouse button

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture fallback
    }
    isDrawingRef.current = true;

    const point = getCanvasCoordinates(e);
    currentPointsRef.current = [point];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw single initial dab
    const currentOpacity =
      currentTool === "marker" ? 0.65 : currentTool === "pencil" ? 0.95 : brushOpacity;
    const strokeSize = currentTool === "pencil" ? Math.max(4, brushSize / 3) : brushSize;

    renderDab(ctx, point, currentTool, selectedColor, strokeSize, currentOpacity);
  };

  // Pointer Move (Drawing tactile stroke in real-time)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!isDrawingRef.current || readOnly) return;

    const point = getCanvasCoordinates(e);
    const pts = currentPointsRef.current;

    // Distance threshold to avoid redundant micro-jitter points
    const lastPoint = pts[pts.length - 1];
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    if (dist < 2.0) return;

    pts.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render textured physical segment immediately
    const currentOpacity =
      currentTool === "marker" ? 0.65 : currentTool === "pencil" ? 0.95 : brushOpacity;
    const strokeSize = currentTool === "pencil" ? Math.max(4, brushSize / 3) : brushSize;

    renderSegment(ctx, lastPoint, point, currentTool, selectedColor, strokeSize, currentOpacity);
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (e.target && (e.target as HTMLElement).releasePointerCapture) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }

    // Broadcast stroke to co-op mode if subscribed
    if (onStrokeRecorded && currentPointsRef.current.length > 0) {
      const currentOpacity =
        currentTool === "marker" ? 0.65 : currentTool === "pencil" ? 0.95 : brushOpacity;
      onStrokeRecorded({
        points: [...currentPointsRef.current],
        color: selectedColor,
        size: currentTool === "pencil" ? Math.max(4, brushSize / 3) : brushSize,
        tool: currentTool,
        opacity: currentOpacity,
      });
    }

    currentPointsRef.current = [];
    pushHistory();
  };

  const currentPalette = COLOR_PALETTES[activePaletteIndex] || COLOR_PALETTES[0];

  return (
    <div className={`flex flex-col h-full select-none ${className}`} ref={containerRef}>
      {/* Top Utility Ribbon */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 || readOnly}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1 || readOnly}
            className="p-2 rounded-xl text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleClear}
            disabled={readOnly}
            className="p-2 rounded-xl text-stone-600 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95"
            title="Clear canvas"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 bg-stone-100 rounded-full px-2 py-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="p-1.5 rounded-full hover:bg-white text-stone-600 transition"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-stone-600 px-1.5">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded-full hover:bg-white text-stone-600 transition"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-full hover:bg-white text-stone-600 transition ml-1"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              isPanMode
                ? "bg-amber-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-white"
            }`}
          >
            {isPanMode ? "Hand / Pan" : "Draw Mode"}
          </button>
        </div>
      </div>

      {/* Main Canvas Display Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-stone-100/70">
        <div
          className="relative transition-transform duration-75 ease-out shadow-2xl rounded-2xl overflow-hidden touch-none border border-stone-300"
          style={{
            width: "min(88vw, 72vh)",
            height: "min(88vw, 72vh)",
            maxWidth: "760px",
            maxHeight: "760px",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            cursor: isPanMode ? "grab" : "crosshair",
          }}
        >
          {/* Layer 1: The Active Shading Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />

          {/* Layer 2: The High-Quality Real Line-Art Image Overlay */}
          {/* mix-blend-mode: multiply ensures the black outlines stay cleanly on top */}
          <img
            src={sheet.imageUrl}
            alt={sheet.title}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ mixBlendMode: "multiply" }}
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Floating Control Center (Mobile Ergonomic Thumb Bar) */}
      <div className="border-t border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3 flex flex-col gap-2.5 shadow-lg">
        {/* Row 1: Brush Tools, Size & Shading Opacity */}
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto w-full">
          {/* Tool Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl">
            <button
              onClick={() => setCurrentTool("crayon")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentTool === "crayon"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Crayon</span>
            </button>
            <button
              onClick={() => setCurrentTool("marker")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentTool === "marker"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
              <span>Marker</span>
            </button>
            <button
              onClick={() => setCurrentTool("pencil")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentTool === "pencil"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="w-1.5 h-3 border border-current rounded-sm" />
              <span>Pencil</span>
            </button>
            <button
              onClick={() => setCurrentTool("eraser")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentTool === "eraser"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Size Slider */}
          <div className="flex items-center gap-2 flex-1 max-w-[200px]">
            <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
              Size
            </span>
            <input
              type="range"
              min="6"
              max="64"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full accent-amber-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
            <div
              className="w-4 h-4 rounded-full border border-stone-300 flex items-center justify-center shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        </div>

        {/* Row 2: Aesthetic Color Palettes & Swatches */}
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto w-full">
          {/* Palette Theme Selector Button */}
          <div className="relative">
            <select
              value={activePaletteIndex}
              onChange={(e) => setActivePaletteIndex(Number(e.target.value))}
              aria-label="Color Palette Theme"
              className="appearance-none bg-stone-100 hover:bg-stone-200 border-none rounded-xl px-2.5 py-1.5 pr-6 text-xs font-semibold text-stone-700 cursor-pointer focus:outline-none transition"
            >
              {COLOR_PALETTES.map((pal, idx) => (
                <option key={pal.id} value={idx}>
                  {pal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swatches Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1 no-scrollbar">
            {currentPalette.colors.map((color) => {
              const isSelected = selectedColor === color && currentTool !== "eraser";
              return (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    if (currentTool === "eraser") setCurrentTool("crayon");
                  }}
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-transform active:scale-90 shadow-sm shrink-0 flex items-center justify-center border-2 ${
                    isSelected
                      ? "border-stone-900 scale-110 shadow-md ring-2 ring-stone-900/10"
                      : "border-white hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              );
            })}

            {/* Custom Hex Color Picker */}
            <div className="relative shrink-0 flex items-center">
              <label
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-stone-300 bg-gradient-to-tr from-rose-400 via-amber-400 to-sky-400 flex items-center justify-center cursor-pointer hover:scale-105 transition shadow-sm"
                title="Custom Color"
              >
                <Palette className="w-3.5 h-3.5 text-white drop-shadow" />
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    if (currentTool === "eraser") setCurrentTool("crayon");
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
