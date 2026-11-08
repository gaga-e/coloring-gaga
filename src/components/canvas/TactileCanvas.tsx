"use client";

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { DrawingSheet } from "@/data/drawings";
import { COLOR_PALETTES } from "@/data/palettes";
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

export interface TactileCanvasHandle {
  exportCanvas: () => string;
}

interface TactileCanvasProps {
  sheet: DrawingSheet;
  onStrokeRecorded?: (stroke: StrokeEvent) => void;
  externalStrokes?: StrokeEvent[];
  onCanvasExportReady?: (dataUrl: string) => void;
  className?: string;
  readOnly?: boolean;
}

export const TactileCanvas = forwardRef<TactileCanvasHandle, TactileCanvasProps>(
  function TactileCanvas(
    {
      sheet,
      onStrokeRecorded,
      externalStrokes,
      onCanvasExportReady,
      className = "",
      readOnly = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lineArtImageRef = useRef<HTMLImageElement | null>(null);

  // Tools & Styling
  const [currentTool, setCurrentTool] = useState<ToolType>("crayon");
  const [selectedColor, setSelectedColor] = useState<string>("#F4ACB7");
  const [brushSize, setBrushSize] = useState<number>(24);
  const [brushOpacity, setBrushOpacity] = useState<number>(0.92);
  const [activePaletteIndex, setActivePaletteIndex] = useState<number>(0);

  // Zoom & Pan
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Pinch-to-Zoom tracking for mobile
  const pinchRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
    midpoint: { x: number; y: number };
  } | null>(null);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);

  // History stack for Undo/Redo (capped at 14 steps)
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const maxHistorySteps = 14;

  const CANVAS_DIMENSION = 800;

  // Initialize canvas with draft recovery support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_DIMENSION;
    canvas.height = CANVAS_DIMENSION;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Check if user has an existing saved draft for this sheet
    const draftKey = `coloring_draft_${sheet.id}`;
    let savedDraft: string | null = null;
    try {
      savedDraft = typeof window !== "undefined" ? sessionStorage.getItem(draftKey) : null;
    } catch {
      savedDraft = null;
    }

    if (savedDraft) {
      const draftImg = new Image();
      draftImg.onload = () => {
        ctx.drawImage(draftImg, 0, 0);
        const restoredSnapshot = ctx.getImageData(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
        setHistory([restoredSnapshot]);
        setHistoryIndex(0);
        exportMergedCanvas();
      };
      draftImg.src = savedDraft;
    } else {
      // Fill with pristine paper background
      ctx.fillStyle = "#FAF8F5";
      ctx.fillRect(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);

      const initialSnapshot = ctx.getImageData(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
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

  // Export full merged canvas (Colored Shading + Transparent Black Line Art)
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

    // 2. Render crisp transparent black line-art cleanly on top
    const lineImg = lineArtImageRef.current;
    if (lineImg && lineImg.complete && lineImg.naturalWidth > 0) {
      try {
        exportCtx.drawImage(lineImg, 0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
      } catch (err) {
        console.warn("Could not draw line art overlay during export:", err);
      }
    }

    let mergedUrl = "";
    try {
      mergedUrl = exportCanvas.toDataURL("image/webp", 0.85);
      if (!mergedUrl.startsWith("data:image/webp")) {
        mergedUrl = exportCanvas.toDataURL("image/jpeg", 0.85);
      }
    } catch {
      try {
        mergedUrl = exportCanvas.toDataURL("image/png");
      } catch {
        // Fallback directly to shading canvas if composited export threw SecurityError
        try {
          mergedUrl = canvas.toDataURL("image/webp", 0.85);
        } catch {
          mergedUrl = canvas.toDataURL();
        }
      }
    }

    // Safety fallback
    if (!mergedUrl) {
      mergedUrl = canvas.toDataURL();
    }

    if (onCanvasExportReady) {
      onCanvasExportReady(mergedUrl);
    }
    return mergedUrl;
  }, [onCanvasExportReady]);

  // Expose imperative export method to parent component
  useImperativeHandle(
    ref,
    () => ({
      exportCanvas: exportMergedCanvas,
    }),
    [exportMergedCanvas]
  );

  // Preload authentic transparent line-art image (avoids crossOrigin taint on local static assets)
  useEffect(() => {
    const img = new Image();
    if (!sheet.imageUrl.startsWith("/")) {
      img.crossOrigin = "anonymous";
    }
    img.src = sheet.imageUrl;
    img.onload = () => {
      lineArtImageRef.current = img;
      exportMergedCanvas();
    };
  }, [sheet.imageUrl, exportMergedCanvas]);

  // Dedicated wheel listener that stops whole-page zoom and zooms the canvas smoothly
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser default whole-page zoom or document scroll
      e.preventDefault();
      e.stopPropagation();

      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = e.clientY - (rect.top + rect.height / 2);

      // Trackpad pinch emits ctrlKey = true with small deltaY; mouse wheels emit standard deltaY
      const factor = e.ctrlKey
        ? Math.exp(-e.deltaY * 0.012)
        : Math.exp(-e.deltaY * 0.0018);

      setZoom((prevZoom) => {
        const nextZoom = Math.min(3.5, Math.max(0.75, prevZoom * factor));
        const effectiveFactor = nextZoom / prevZoom;

        // Keep the point under the cursor stable during zoom
        setPan((prevPan) => ({
          x: mouseX - (mouseX - prevPan.x) * effectiveFactor,
          y: mouseY - (mouseY - prevPan.y) * effectiveFactor,
        }));

        return nextZoom;
      });
    };

    // Passive false is essential so e.preventDefault() stops whole-page zoom
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Dedicated mobile multi-touch pinch-to-zoom and two-finger pan
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Stop default browser pinch-zoom of page
        e.preventDefault();

        // If a drawing stroke was active with 1 finger, abort it immediately
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          currentPointsRef.current = [];
        }

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const mid = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        pinchRef.current = {
          initialDist: dist,
          initialZoom: zoom,
          initialPan: { ...pan },
          midpoint: mid,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const currentMid = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };

        const scale = dist / pinchRef.current.initialDist;
        const nextZoom = Math.min(3.5, Math.max(0.75, pinchRef.current.initialZoom * scale));

        const dx = currentMid.x - pinchRef.current.midpoint.x;
        const dy = currentMid.y - pinchRef.current.midpoint.y;

        setZoom(nextZoom);
        setPan({
          x: pinchRef.current.initialPan.x + dx,
          y: pinchRef.current.initialPan.y + dy,
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchRef.current = null;
      }
    };

    viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [zoom, pan]);

  // Robust, gapless tactile brush rendering: Eliminates white lines and micro-gaps
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
      ctx.lineWidth = size * 1.25;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (tool === "crayon") {
      // 1. CRAYON: Solid, opaque waxy core + authentic wax paper-tooth edge
      // Core waxy stroke: 100% gapless continuous body so no white lines show through
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = size;
      ctx.globalAlpha = Math.min(1.0, opacity * 0.92);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Subtle tactile waxy tooth speckles catching the rough paper along the edge
      const step = Math.max(3, size * 0.22);
      const steps = Math.max(1, Math.ceil(dist / step));
      const speckleCount = Math.max(4, Math.floor(size * 0.35));
      const radius = size * 0.54;

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;

        for (let k = 0; k < speckleCount; k++) {
          const r = Math.pow(Math.random(), 0.7) * radius;
          const theta = Math.random() * Math.PI * 2;
          const px = cx + Math.cos(theta) * r;
          const py = cy + Math.sin(theta) * r;
          const speckleAlpha = (0.2 + Math.random() * 0.5) * opacity;
          const dotDim = Math.random() * 1.6 + 0.8;

          ctx.globalAlpha = speckleAlpha;
          ctx.beginPath();
          ctx.arc(px, py, dotDim / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (tool === "marker") {
      // 2. MARKER: Fluid, rich saturated alcohol ink with smooth, seamless blend
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;

      // Layer A: Soft outer wet bleed halo
      ctx.lineWidth = size * 1.08;
      ctx.globalAlpha = opacity * 0.22;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Layer B: Rich, fully saturated solid ink core (eliminates white stripes)
      ctx.lineWidth = size;
      ctx.globalAlpha = Math.min(1.0, opacity * 0.96);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (tool === "pencil") {
      // 3. PENCIL: Fine sharp colored pencil with smooth graphite tooth
      const leadSize = Math.max(3, size * 0.55);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Solid central lead stroke
      ctx.lineWidth = leadSize;
      ctx.globalAlpha = Math.min(1.0, opacity * 0.92);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Fine powdery graphite dust along stroke path
      const steps = Math.max(1, Math.ceil(dist / 3.0));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = p1.x + (p2.x - p1.x) * t;
        const cy = p1.y + (p2.y - p1.y) * t;

        for (let k = 0; k < 2; k++) {
          const ox = cx + (Math.random() - 0.5) * (leadSize * 1.5);
          const oy = cy + (Math.random() - 0.5) * (leadSize * 1.5);
          ctx.globalAlpha = (0.2 + Math.random() * 0.4) * opacity;
          ctx.fillRect(ox, oy, 1.2, 1.2);
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

  // Helper to render a full stroke onto 2D context
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

  // Save current canvas to history and debounce-save draft to session
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

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`coloring_draft_${sheet.id}`, canvas.toDataURL("image/webp", 0.6));
      } catch {
        // Ignored
      }
    }

    if (onCanvasExportReady) {
      exportMergedCanvas();
    }
  }, [historyIndex, onCanvasExportReady, sheet.id, exportMergedCanvas]);

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
    exportMergedCanvas();
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
    exportMergedCanvas();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, CANVAS_DIMENSION, CANVAS_DIMENSION);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(`coloring_draft_${sheet.id}`);
      } catch {
        // Ignored
      }
    }
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

    // Pan with hand mode, middle mouse button, or right mouse button
    if (isPanMode || e.button === 1 || e.buttons === 4 || e.button === 2) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0 && e.pointerType === "mouse") return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    isDrawingRef.current = true;

    const point = getCanvasCoordinates(e);
    currentPointsRef.current = [point];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentOpacity =
      currentTool === "marker" ? 0.96 : currentTool === "pencil" ? 0.92 : brushOpacity;
    const strokeSize = currentTool === "pencil" ? Math.max(4, brushSize * 0.55) : brushSize;

    renderDab(ctx, point, currentTool, selectedColor, strokeSize, currentOpacity);
  };

  // Pointer Move with high-density step interpolation to eliminate gaps & white lines
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
    if (pts.length === 0) return;

    const lastPoint = pts[pts.length - 1];
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);

    // Micro-jitter deadband
    if (dist < 1.5) return;

    pts.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentOpacity =
      currentTool === "marker" ? 0.96 : currentTool === "pencil" ? 0.92 : brushOpacity;
    const strokeSize = currentTool === "pencil" ? Math.max(4, brushSize * 0.55) : brushSize;

    // High-speed stroke interpolation: prevents white gaps when moving fast
    const maxStep = Math.max(3, strokeSize * 0.3);
    if (dist > maxStep) {
      const steps = Math.ceil(dist / maxStep);
      for (let i = 1; i <= steps; i++) {
        const t0 = (i - 1) / steps;
        const t1 = i / steps;
        const subP1 = {
          x: lastPoint.x + (point.x - lastPoint.x) * t0,
          y: lastPoint.y + (point.y - lastPoint.y) * t0,
        };
        const subP2 = {
          x: lastPoint.x + (point.x - lastPoint.x) * t1,
          y: lastPoint.y + (point.y - lastPoint.y) * t1,
        };
        renderSegment(ctx, subP1, subP2, currentTool, selectedColor, strokeSize, currentOpacity);
      }
    } else {
      renderSegment(ctx, lastPoint, point, currentTool, selectedColor, strokeSize, currentOpacity);
    }
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

    if (onStrokeRecorded && currentPointsRef.current.length > 0) {
      const currentOpacity =
        currentTool === "marker" ? 0.96 : currentTool === "pencil" ? 0.92 : brushOpacity;
      onStrokeRecorded({
        points: [...currentPointsRef.current],
        color: selectedColor,
        size: currentTool === "pencil" ? Math.max(4, brushSize * 0.55) : brushSize,
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
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 border-b border-stone-200 bg-white/80 backdrop-blur-md shrink-0 gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 || readOnly}
            className="p-1.5 sm:p-2 rounded-xl text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="Undo"
          >
            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1 || readOnly}
            className="p-1.5 sm:p-2 rounded-xl text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="Redo"
          >
            <Redo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={handleClear}
            disabled={readOnly}
            className="p-1.5 sm:p-2 rounded-xl text-stone-600 hover:bg-rose-50 hover:text-rose-600 transition active:scale-95"
            title="Clear canvas"
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Zoom & View Controls (Canvas Isolated Zoom) */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.max(0.75, Math.round((z - 0.25) * 100) / 100))}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white text-stone-600 transition"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="text-[11px] sm:text-xs font-bold text-stone-600 px-1 sm:px-1.5 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.5, Math.round((z + 0.25) * 100) / 100))}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white text-stone-600 transition"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 sm:p-1.5 rounded-full hover:bg-white text-stone-600 transition ml-0.5"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold transition ml-0.5 sm:ml-1 ${
              isPanMode
                ? "bg-amber-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-white"
            }`}
            title={isPanMode ? "Pan Mode (Drag to move canvas)" : "Draw Mode"}
          >
            {isPanMode ? "Pan" : "Draw"}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-stone-100/70 touch-none cursor-default"
      >
        <div
          className="relative transition-transform duration-75 ease-out shadow-2xl rounded-2xl overflow-hidden touch-none border border-stone-300"
          style={{
            width: "min(88vw, 70vh)",
            height: "min(88vw, 70vh)",
            maxWidth: "760px",
            maxHeight: "760px",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            cursor: isPanMode ? (isPanningRef.current ? "grabbing" : "grab") : "crosshair",
          }}
        >
          {/* Layer 1: Active Shading Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
          />

          {/* Layer 2: Authentic Transparent Black Line-Art Image Overlay */}
          <img
            src={sheet.imageUrl}
            alt={sheet.title}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Bottom Floating Control Center (Responsive Mobile-Ergonomic Bar) */}
      <div className="border-t border-stone-200 bg-white/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col gap-2 shrink-0 shadow-lg">
        {/* Row 1: Brush Tools & Size Slider */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-2xl mx-auto w-full">
          {/* Tool Selector */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 p-0.5 sm:p-1 rounded-2xl shrink-0">
            <button
              onClick={() => {
                setCurrentTool("crayon");
                setIsPanMode(false);
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                currentTool === "crayon" && !isPanMode
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Crayon</span>
            </button>
            <button
              onClick={() => {
                setCurrentTool("marker");
                setIsPanMode(false);
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                currentTool === "marker" && !isPanMode
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
              <span>Marker</span>
            </button>
            <button
              onClick={() => {
                setCurrentTool("pencil");
                setIsPanMode(false);
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                currentTool === "pencil" && !isPanMode
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <span className="w-1.5 h-3 border border-current rounded-sm" />
              <span>Pencil</span>
            </button>
            <button
              onClick={() => {
                setCurrentTool("eraser");
                setIsPanMode(false);
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold transition ${
                currentTool === "eraser" && !isPanMode
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Size Slider */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[90px] max-w-[180px]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 whitespace-nowrap">
              Size
            </span>
            <input
              type="range"
              min="8"
              max="64"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full accent-amber-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
            <div
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-stone-300 shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        </div>

        {/* Row 2: Aesthetic Color Palettes & Swatches */}
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto w-full">
          {/* Palette Theme Selector Button */}
          <div className="relative shrink-0">
            <select
              value={activePaletteIndex}
              onChange={(e) => setActivePaletteIndex(Number(e.target.value))}
              aria-label="Color Palette Theme"
              className="appearance-none bg-stone-100 hover:bg-stone-200 border-none rounded-xl px-2 sm:px-2.5 py-1.5 pr-5 sm:pr-6 text-[11px] sm:text-xs font-semibold text-stone-700 cursor-pointer focus:outline-none transition max-w-[110px] sm:max-w-[130px] truncate"
            >
              {COLOR_PALETTES.map((pal, idx) => (
                <option key={pal.id} value={idx}>
                  {pal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Swatches Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 px-0.5 no-scrollbar min-w-0">
            {currentPalette.colors.map((color) => {
              const isSelected = selectedColor === color && currentTool !== "eraser";
              return (
                <button
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    if (currentTool === "eraser") setCurrentTool("crayon");
                    setIsPanMode(false);
                  }}
                  className={`relative w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-transform active:scale-90 shadow-sm shrink-0 flex items-center justify-center border-2 ${
                    isSelected
                      ? "border-stone-900 scale-110 shadow-md ring-2 ring-stone-900/15"
                      : "border-white hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {isSelected && <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow" />}
                </button>
              );
            })}

            {/* Custom Hex Color Picker */}
            <div className="relative shrink-0 flex items-center">
              <label
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-stone-300 bg-gradient-to-tr from-rose-400 via-amber-400 to-sky-400 flex items-center justify-center cursor-pointer hover:scale-105 transition shadow-sm"
                title="Custom Color"
              >
                <Palette className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow" />
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    setSelectedColor(e.target.value);
                    if (currentTool === "eraser") setCurrentTool("crayon");
                    setIsPanMode(false);
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
});
