"use client";

import { useEffect, useRef, useState } from "react";
import api from "../../lib/axios";
import { renderStrokes, sheetColors } from "../../lib/canvas";
import { useTheme } from "../../hooks/useTheme";
import type { Stroke } from "../../types/type";

// Shared across tiles so navigating back to the dashboard doesn't refetch everything.
const cache = new Map<string, Stroke[]>();

/** Live preview of a board's drawing, fetched only once the tile scrolls into view. */
export default function BoardThumb({ boardId, version }: { boardId: string; version: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const key = `${boardId}:${version}`;
  const [strokes, setStrokes] = useState<Stroke[] | null>(() => cache.get(key) ?? null);
  const { theme } = useTheme();
  const sheet = sheetColors(theme);

  useEffect(() => {
    if (strokes || !wrapRef.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        api
          .get<{ strokes: Stroke[] }>(`/draw/${boardId}`)
          .then((res) => {
            cache.set(key, res.data.strokes);
            setStrokes(res.data.strokes);
          })
          .catch(() => setStrokes([]));
      },
      { rootMargin: "200px" },
    );
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, [boardId, key, strokes]);

  useEffect(() => {
    if (!strokes?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const draw = () => renderStrokes(canvas, strokes, theme);
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [strokes, theme]);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-[16/10] overflow-hidden"
      style={{
        backgroundColor: sheet.bg,
        backgroundImage: `radial-gradient(${sheet.dot} 1px, transparent 1.2px)`,
        backgroundSize: "14px 14px",
      }}
    >
      {strokes === null ? (
        <div className="absolute inset-0 animate-pulse bg-ink/[0.04]" />
      ) : strokes.length === 0 ? (
        <p className="absolute inset-0 grid place-items-center font-mono text-[11px] tracking-[0.15em] text-label uppercase">[Empty sheet]</p>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      )}
    </div>
  );
}
