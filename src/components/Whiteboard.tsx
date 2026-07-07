"use client";

import React, { useRef, useEffect, useState } from "react";
import { Trash2, X, ShieldAlert } from "lucide-react";
import { database } from "@/lib/firebase";
import { ref, push, onChildAdded, onValue, set, off } from "firebase/database";
import { useTheme } from "@/context/ThemeContext";

interface WhiteboardProps {
  roomId: string;
  onClose: () => void;
}

interface StrokePoint {
  x0: number; // normalized 0 to 1
  y0: number; // normalized 0 to 1
  x1: number; // normalized 0 to 1
  y1: number; // normalized 0 to 1
  color: string;
}

export default function Whiteboard({ roomId, onClose }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const { theme } = useTheme();

  // Monochrome colors: Black (in light mode), White (in dark mode), and Greys
  const [currentColor, setCurrentColor] = useState("#000000");

  useEffect(() => {
    // Detect theme on mount and set appropriate default color
    const isDark = theme === "dark";
    setCurrentColor(isDark ? "#ffffff" : "#000000");
  }, [theme]);

  // Sync canvas size to container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Keep backup of image
      const ctx = canvas.getContext("2d");
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx && ctx) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Restore drawing
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const strokesRef = ref(database, `rooms/${roomId}/whiteboard/strokes`);

    const drawRemoteLine = (point: StrokePoint) => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.beginPath();
      ctx.strokeStyle = point.color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(point.x0 * w, point.y0 * h);
      ctx.lineTo(point.x1 * w, point.y1 * h);
      ctx.stroke();
      ctx.closePath();
    };

    // Listen to new strokes
    const handleNewStroke = onChildAdded(strokesRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        drawRemoteLine(val);
      }
    });

    // Listen to canvas clear trigger
    const whiteboardRef = ref(database, `rooms/${roomId}/whiteboard`);
    const handleWhiteboardValue = onValue(whiteboardRef, (snapshot) => {
      if (!snapshot.hasChild("strokes")) {
        // Clear local canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    return () => {
      off(strokesRef, "child_added", handleNewStroke);
      off(whiteboardRef, "value", handleWhiteboardValue);
    };
  }, [roomId]);

  // Handle Drawing Starts
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    isDrawingRef.current = true;
    lastPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Handle Drawing
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const w = canvas.width;
    const h = canvas.height;

    // Draw locally immediately for zero latency
    ctx.beginPath();
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    ctx.closePath();

    // Push normalized coordinates to Firebase DB
    const strokesRef = ref(database, `rooms/${roomId}/whiteboard/strokes`);
    push(strokesRef, {
      x0: lastPosRef.current.x / w,
      y0: lastPosRef.current.y / h,
      x1: currentX / w,
      y1: currentY / h,
      color: currentColor,
    });

    lastPosRef.current = { x: currentX, y: currentY };
  };

  // Handle Drawing Ends
  const handleMouseUpOrLeave = () => {
    isDrawingRef.current = false;
  };

  // Clear whiteboard for all participants
  const handleClearWhiteboard = async () => {
    const whiteboardRef = ref(database, `rooms/${roomId}/whiteboard`);
    await set(whiteboardRef, null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-vercel-light dark:bg-vercel-black border border-vercel-border-light dark:border-vercel-border-dark rounded-lg overflow-hidden relative">
      {/* Top Controls Bar */}
      <div className="h-12 px-4 border-b border-vercel-border-light dark:border-vercel-border-dark bg-vercel-light dark:bg-vercel-dark flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold tracking-wider uppercase font-mono">Whiteboard</span>
          {/* Simple Monochrome Brush Color Indicators */}
          <div className="flex items-center gap-1.5 ml-4">
            {["#000000", "#7f7f7f", "#ffffff", "#ef4444"].map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                style={{ backgroundColor: color }}
                className={`w-4 h-4 rounded-full border transition-all ${
                  currentColor === color 
                    ? "border-vercel-text-light dark:border-vercel-light scale-125 shadow-sm" 
                    : "border-vercel-border-light dark:border-vercel-border-dark hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClearWhiteboard}
            className="p-1.5 border border-vercel-border-light dark:border-vercel-border-dark rounded hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors text-vercel-text-muted flex items-center gap-1"
            title="Clear Canvas for All"
          >
            <Trash2 className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Clear</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 border border-vercel-border-light dark:border-vercel-border-dark rounded hover:bg-vercel-border-light dark:hover:bg-vercel-border-dark transition-colors text-vercel-text-light dark:text-vercel-text-dark"
            title="Close Whiteboard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Drawing Canvas Container */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full relative cursor-crosshair bg-vercel-light dark:bg-vercel-black text-neutral-300/30 dark:text-neutral-800/40 transition-colors duration-200"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="absolute inset-0 block touch-none"
        />
      </div>
    </div>
  );
}
