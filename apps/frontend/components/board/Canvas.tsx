"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eraser, Highlighter, PenLine, Redo2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useBoardSocket } from "../../hooks/useBoardSocket";
import { drawStroke, fitWorld, GRID, inkColor, INKS, sheetColors, SIZES, WORLD } from "../../lib/canvas";
import { useTheme } from "../../hooks/useTheme";
import { cn, markerFor, uid } from "../../lib/utils";
import type { Stroke, Tool, User } from "../../types/type";
import { ConfirmDialog } from "../ui/Dialog";
import Spinner from "../ui/Spinner";

interface RemoteCursor {
  name: string;
  x: number;
  y: number;
  at: number;
}

const PREVIEW_MS = 60;
const CURSOR_MS = 40;
const MIN_DIST = 0.8; // world units between recorded points

const TOOLS: { id: Tool; label: string; key: string; icon: typeof PenLine }[] = [
  { id: "pen", label: "Pen", key: "P", icon: PenLine },
  { id: "highlighter", label: "Highlighter", key: "H", icon: Highlighter },
  { id: "eraser", label: "Eraser", key: "E", icon: Eraser },
];

export default function Canvas({ boardId, me, isOwner, boardTitle }: { boardId: string; me: User; isOwner: boolean; boardTitle: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);

  // Drawing state lives in refs: it changes at pointer rate and must not re-render React.
  const strokes = useRef<Stroke[]>([]);
  const previews = useRef(new Map<string, Stroke>());
  const current = useRef<Stroke | null>(null);
  const mine = useRef<string[]>([]);
  const redo = useRef<Stroke[]>([]);
  const view = useRef({ scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 });
  const liveFrame = useRef(0);
  const lastPreview = useRef(0);
  const lastCursor = useRef(0);

  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState({ left: 0, top: 0, width: 0, height: 0, grid: GRID });
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(INKS[0].hex);
  const [size, setSize] = useState<number>(SIZES[1].value);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [confirmClear, setConfirmClear] = useState(false);

  // ---- Rendering -----------------------------------------------------------------

  const ctxFor = (canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext("2d");
    if (!ctx) return null;
    const { dpr, scale, ox, oy } = view.current;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
    return ctx;
  };

  const clearCanvas = (canvas: HTMLCanvasElement | null) => {
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawBase = useCallback(() => {
    clearCanvas(baseRef.current);
    const ctx = ctxFor(baseRef.current);
    if (!ctx) return;
    // Clip to the sheet so strokes past the edge don't spill onto the surrounding UI.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, WORLD.w, WORLD.h);
    ctx.clip();
    for (const s of strokes.current) drawStroke(ctx, s, themeRef.current);
    ctx.restore();
  }, []);

  const drawOnBase = (s: Stroke) => {
    const ctx = ctxFor(baseRef.current);
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, WORLD.w, WORLD.h);
    ctx.clip();
    drawStroke(ctx, s, themeRef.current);
    ctx.restore();
  };

  /** Overlay: in-progress strokes (mine and others'). Batched to one paint per frame. */
  const scheduleLive = useCallback(() => {
    if (liveFrame.current) return;
    liveFrame.current = requestAnimationFrame(() => {
      liveFrame.current = 0;
      clearCanvas(liveRef.current);
      const ctx = ctxFor(liveRef.current);
      if (!ctx) return;
      for (const s of previews.current.values()) if (s.tool !== "eraser") drawStroke(ctx, s, themeRef.current);
      const c = current.current;
      if (c && c.tool !== "eraser") drawStroke(ctx, c, themeRef.current);
    });
  }, []);

  const syncHistory = () => {
    const ids = new Set(strokes.current.map((s) => s.id));
    mine.current = mine.current.filter((id) => ids.has(id));
    setHistory({ canUndo: mine.current.length > 0, canRedo: redo.current.length > 0 });
  };

  // Size canvases to the container and fit the world inside.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      const { width, height } = el.getBoundingClientRect();
      const pad = width < 640 ? 12 : 28;
      const fit = fitWorld(width - pad * 2, height - pad * 2);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view.current = { scale: fit.scale, ox: fit.ox + pad, oy: fit.oy + pad, dpr, w: width, h: height };
      for (const c of [baseRef.current, liveRef.current]) {
        if (!c) continue;
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }
      setSheet({ left: fit.ox + pad, top: fit.oy + pad, width: WORLD.w * fit.scale, height: WORLD.h * fit.scale, grid: GRID * fit.scale });
      redrawBase();
      scheduleLive();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    return () => ro.disconnect();
  }, [redrawBase, scheduleLive]);

  // Repaint everything in the new theme's inks when the theme changes.
  useEffect(() => {
    themeRef.current = theme;
    redrawBase();
    scheduleLive();
  }, [theme, redrawBase, scheduleLive]);

  // ---- Realtime --------------------------------------------------------------------

  const { socket, connected } = useBoardSocket("draw", boardId, {
    initialDrawing: ({ strokes: initial }: { strokes: Stroke[] }) => {
      strokes.current = initial;
      previews.current.clear();
      redrawBase();
      scheduleLive();
      syncHistory();
      setReady(true);
    },
    newStroke: (s: Stroke) => {
      previews.current.delete(s.id);
      if (!strokes.current.some((x) => x.id === s.id)) {
        strokes.current.push(s);
        drawOnBase(s);
      }
      scheduleLive();
    },
    strokePreview: (s: Stroke) => {
      previews.current.set(s.id, s);
      scheduleLive();
    },
    strokeRemoved: ({ id }: { id: string }) => {
      const before = strokes.current.length;
      strokes.current = strokes.current.filter((s) => s.id !== id);
      if (strokes.current.length !== before) {
        redrawBase();
        syncHistory();
      }
    },
    canvasCleared: () => {
      strokes.current = [];
      previews.current.clear();
      mine.current = [];
      redo.current = [];
      redrawBase();
      scheduleLive();
      syncHistory();
      toast("The canvas was cleared");
    },
    cursorMove: ({ userId, name, position }: { userId: string; name: string; position: { x: number; y: number } }) => {
      setCursors((c) => ({ ...c, [userId]: { name, x: position.x, y: position.y, at: Date.now() } }));
    },
    cursorLeave: ({ userId }: { userId: string }) => {
      setCursors(({ [userId]: _gone, ...rest }) => rest);
    },
    error: ({ message }: { message: string }) => toast.error(message),
  });

  // Hide cursors that went quiet (tab in background, etc.).
  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 8000;
      setCursors((c) => {
        const fresh = Object.fromEntries(Object.entries(c).filter(([, v]) => v.at > cutoff));
        return Object.keys(fresh).length === Object.keys(c).length ? c : fresh;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // ---- Input -----------------------------------------------------------------------

  const toWorld = (clientX: number, clientY: number) => {
    const rect = liveRef.current!.getBoundingClientRect();
    const { scale, ox, oy } = view.current;
    return { x: (clientX - rect.left - ox) / scale, y: (clientY - rect.top - oy) / scale };
  };

  const emitCursor = (x: number, y: number, now: number) => {
    if (now - lastCursor.current < CURSOR_MS) return;
    lastCursor.current = now;
    socket?.volatile.emit("cursorMove", { boardId, position: { x: Math.round(x), y: Math.round(y) } });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toWorld(e.clientX, e.clientY);
    current.current = { id: uid(), userId: me.id, tool, color, size, points: [x, y] };
    scheduleLive();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = performance.now();
    const c = current.current;
    if (!c) {
      const { x, y } = toWorld(e.clientX, e.clientY);
      emitCursor(x, y, now);
      return;
    }
    // Coalesced events give every sample a fast stylus produced, not just one per frame.
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of samples.length ? samples : [e.nativeEvent]) {
      const { x, y } = toWorld(ev.clientX, ev.clientY);
      const n = c.points.length;
      if (Math.hypot(x - c.points[n - 2], y - c.points[n - 1]) >= MIN_DIST) c.points.push(x, y);
    }
    const last = c.points.length;
    emitCursor(c.points[last - 2], c.points[last - 1], now);

    if (c.tool === "eraser") {
      drawOnBase(c); // erasing shows immediately on the committed layer
    } else {
      scheduleLive();
    }
    if (now - lastPreview.current > PREVIEW_MS && c.points.length < 8000) {
      lastPreview.current = now;
      socket?.volatile.emit("strokePreview", { boardId, stroke: c });
    }
  };

  const commitStroke = (s: Stroke) => {
    strokes.current.push(s);
    mine.current.push(s.id);
    socket?.emit("newStroke", { boardId, stroke: s });
  };

  const onPointerUp = () => {
    const c = current.current;
    current.current = null;
    if (!c) return;
    c.points = c.points.slice(0, 8000).map((n) => Math.round(n * 10) / 10);
    if (c.tool !== "eraser") drawOnBase(c);
    commitStroke(c);
    redo.current = [];
    scheduleLive();
    syncHistory();
  };

  // ---- Commands --------------------------------------------------------------------

  const undo = useCallback(() => {
    const id = mine.current.pop();
    if (!id) return;
    const stroke = strokes.current.find((s) => s.id === id);
    strokes.current = strokes.current.filter((s) => s.id !== id);
    if (stroke) redo.current.push(stroke);
    socket?.emit("removeStroke", { boardId, strokeId: id });
    redrawBase();
    syncHistory();
  }, [boardId, redrawBase, socket]);

  const redoLast = useCallback(() => {
    const stroke = redo.current.pop();
    if (!stroke) return;
    const again = { ...stroke, id: uid() };
    drawOnBase(again);
    commitStroke(again);
    syncHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, socket]);

  const exportPng = () => {
    // Strokes go on their own layer first so eraser strokes don't punch through the paper.
    const ink = document.createElement("canvas");
    ink.width = WORLD.w;
    ink.height = WORLD.h;
    const inkCtx = ink.getContext("2d")!;
    for (const s of strokes.current) drawStroke(inkCtx, s, theme);
    const out = document.createElement("canvas");
    out.width = WORLD.w;
    out.height = WORLD.h;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = sheetColors(theme).bg;
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.drawImage(ink, 0, 0);
    const a = document.createElement("a");
    a.download = `${boardTitle.replace(/[^\w\- ]+/g, "").trim() || "board"}.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  };

  const clearAll = () => {
    socket?.emit("clearCanvas", { boardId });
    setConfirmClear(false);
  };

  // Keyboard shortcuts (ignored while typing in chat, dialogs, etc.).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true], dialog")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoLast();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoLast();
      } else if (!mod && !e.altKey) {
        const match = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
        if (match) setTool(match.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redoLast]);

  const { scale, ox, oy } = view.current;

  return (
    <div className="relative h-full w-full overflow-hidden bg-paper">
      <div ref={containerRef} className="absolute inset-0">
        {/* The sheet: paper + dot grid, sized to the world */}
        <div
          aria-hidden
          className="absolute rounded-[4px] shadow-float ring-1 ring-line"
          style={{
            left: sheet.left,
            top: sheet.top,
            width: sheet.width,
            height: sheet.height,
            backgroundColor: sheetColors(theme).bg,
            backgroundImage: `radial-gradient(${sheetColors(theme).dot} ${Math.max(0.8, sheet.grid / 30)}px, transparent ${Math.max(1, sheet.grid / 26)}px)`,
            backgroundSize: `${sheet.grid}px ${sheet.grid}px`,
            backgroundPosition: `${sheet.grid / 2}px ${sheet.grid / 2}px`,
          }}
        />
        <canvas ref={baseRef} className="absolute inset-0 h-full w-full" aria-hidden />
        <canvas
          ref={liveRef}
          role="img"
          aria-label={`Shared drawing for ${boardTitle}. Use the toolbar to pick a pen, highlighter or eraser.`}
          className={cn("absolute inset-0 h-full w-full touch-none", tool === "eraser" ? "cursor-cell" : "cursor-crosshair")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {/* Teammates' cursors */}
        {Object.entries(cursors).map(([userId, c]) => (
          <div
            key={userId}
            className="pointer-events-none absolute top-0 left-0 z-10 transition-transform duration-75 ease-linear"
            style={{ transform: `translate(${ox + c.x * scale}px, ${oy + c.y * scale}px)` }}
          >
            <svg width="16" height="20" viewBox="0 0 14 20" aria-hidden>
              <path d="M0 0 L0 17 L4.6 12.8 L7.7 19.7 L10.5 18.5 L7.5 11.8 L13.2 11.6 Z" fill={markerFor(userId)} stroke="white" strokeWidth="1.3" />
            </svg>
            <span
              className="absolute top-4 left-3 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white shadow-sheet"
              style={{ backgroundColor: markerFor(userId) }}
            >
              {c.name}
            </span>
          </div>
        ))}
      </div>

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-muted" role="status">
          <span className="flex items-center gap-2 rounded-full border border-line bg-sheet px-4 py-2 text-sm shadow-sheet">
            <Spinner className="h-4 w-4" /> Loading the canvas
          </span>
        </div>
      )}
      {ready && !connected && (
        <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-brass/40 bg-brass-soft px-3 py-1.5 text-[13px] font-medium text-ink shadow-sheet" role="status">
          Reconnecting… your strokes will sync when you&apos;re back.
        </div>
      )}

      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Drawing tools"
        className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[10px] border border-line bg-paper/95 p-1.5 shadow-float backdrop-blur md:top-1/2 md:bottom-auto md:left-3 md:-translate-x-0 md:-translate-y-1/2 md:flex-col md:overflow-visible"
      >
        {TOOLS.map(({ id, label, key, icon: Icon }) => (
          <ToolButton key={id} label={`${label} (${key})`} active={tool === id} onClick={() => setTool(id)}>
            <Icon className="h-[18px] w-[18px]" />
          </ToolButton>
        ))}
        <Divider />
        <div role="radiogroup" aria-label="Ink colour" className="flex items-center gap-1 md:flex-col">
          {INKS.map((ink) => (
            <button
              key={ink.hex}
              type="button"
              role="radio"
              aria-checked={color === ink.hex}
              aria-label={ink.name}
              title={ink.name}
              disabled={tool === "eraser"}
              onClick={() => setColor(ink.hex)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform hover:scale-110 disabled:opacity-35 disabled:hover:scale-100"
            >
              <span
                className={cn("h-[18px] w-[18px] rounded-full ring-offset-2 ring-offset-sheet transition-shadow", color === ink.hex && tool !== "eraser" && "ring-2")}
                style={{ backgroundColor: inkColor(ink.hex, theme), ["--tw-ring-color" as string]: inkColor(ink.hex, theme) }}
              />
            </button>
          ))}
        </div>
        <Divider />
        <div role="radiogroup" aria-label="Stroke size" className="flex items-center gap-1 md:flex-col">
          {SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={size === s.value}
              aria-label={s.name}
              title={s.name}
              onClick={() => setSize(s.value)}
              className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink hover:bg-sheet-2", size === s.value && "bg-sheet-2")}
            >
              <span className="rounded-full bg-current" style={{ width: s.value + 2, height: s.value + 2 }} />
            </button>
          ))}
        </div>
        <Divider />
        <ToolButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!history.canUndo}>
          <Undo2 className="h-[18px] w-[18px]" />
        </ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={redoLast} disabled={!history.canRedo}>
          <Redo2 className="h-[18px] w-[18px]" />
        </ToolButton>
        <ToolButton label="Download as PNG" onClick={exportPng} disabled={!ready}>
          <Download className="h-[18px] w-[18px]" />
        </ToolButton>
        {isOwner && (
          <ToolButton label="Clear canvas for everyone" onClick={() => setConfirmClear(true)} disabled={!ready} danger>
            <Trash2 className="h-[18px] w-[18px]" />
          </ToolButton>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        title="Clear the canvas?"
        description="Every stroke is removed for everyone on this board. Chat and files aren't affected."
        confirmLabel="Clear canvas"
      />
    </div>
  );
}

function ToolButton({
  label,
  active,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors disabled:opacity-35",
        active ? "bg-signal text-on-signal" : danger ? "text-danger hover:bg-danger-soft" : "text-ink-2 hover:bg-sheet-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-line md:mx-0 md:my-0.5 md:h-px md:w-6" />;
}
