import type { Stroke, Tool } from "../types/type";

/**
 * Every client draws in the same fixed "world" and scales it to fit its screen, so a
 * stroke lands in the same place for everyone regardless of window size.
 */
export const WORLD = { w: 1600, h: 1000 } as const;

export type CanvasTheme = "light" | "dark";

/** The sheet follows the app theme: bone paper in light, jet in dark. */
const SHEETS: Record<CanvasTheme, { bg: string; dot: string }> = {
  light: { bg: "#fbfaf7", dot: "rgba(11, 11, 11, 0.16)" },
  dark: { bg: "#111111", dot: "rgba(42, 157, 244, 0.32)" },
};
export const sheetColors = (theme: CanvasTheme) => SHEETS[theme];
export const GRID = 32;

/**
 * Inks are stored as their light-theme hex (so saved boards never change) and mapped to
 * a brighter variant on the dark sheet. "Ink" itself flips to the bone text colour.
 */
export const INKS = [
  { name: "Ink", hex: "#121a2b", dark: "#f4f3ef" },
  { name: "Ultramarine", hex: "#2f4bd8", dark: "#7b93ff" },
  { name: "Vermilion", hex: "#d9432a", dark: "#ff7a5c" },
  { name: "Emerald", hex: "#0e8a6a", dark: "#3dcca3" },
  { name: "Amber", hex: "#d19a1e", dark: "#f0bd55" },
  { name: "Plum", hex: "#8b3fa8", dark: "#c98ae6" },
] as const;

const DARK_INK: Record<string, string> = Object.fromEntries(INKS.map((i) => [i.hex, i.dark]));
DARK_INK["#1c1917"] = "#f4f3ef"; // legacy default ink

export function inkColor(hex: string, theme: CanvasTheme): string {
  return theme === "dark" ? DARK_INK[hex.toLowerCase()] ?? hex : hex;
}

export const SIZES = [
  { name: "Fine", value: 2 },
  { name: "Medium", value: 4 },
  { name: "Bold", value: 8 },
] as const;

export const TOOL_WIDTH: Record<Tool, number> = { pen: 1, highlighter: 4, eraser: 5 };

type Drawable = Pick<Stroke, "tool" | "color" | "size" | "points">;

/**
 * Draw one stroke in world coordinates (caller sets the world→screen transform).
 * Points are joined with quadratic curves through midpoints for smooth lines.
 */
export function drawStroke(ctx: CanvasRenderingContext2D, s: Drawable, theme: CanvasTheme = "light") {
  const p = s.points;
  if (p.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.size * TOOL_WIDTH[s.tool];

  if (s.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
  } else {
    ctx.strokeStyle = inkColor(s.color, theme);
    if (s.tool === "highlighter") ctx.globalAlpha = theme === "dark" ? 0.38 : 0.3;
  }

  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (p.length === 2) {
    ctx.lineTo(p[0] + 0.01, p[1]); // a dot
  } else if (p.length === 4) {
    ctx.lineTo(p[2], p[3]);
  } else {
    for (let i = 2; i < p.length - 2; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2;
      const my = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    ctx.lineTo(p[p.length - 2], p[p.length - 1]);
  }
  ctx.stroke();
  ctx.restore();
}

/** Fit the world into a w×h box, centred. */
export function fitWorld(w: number, h: number) {
  const scale = Math.min(w / WORLD.w, h / WORLD.h);
  return { scale, ox: (w - WORLD.w * scale) / 2, oy: (h - WORLD.h * scale) / 2 };
}

/** Render strokes into a canvas element at its CSS size × devicePixelRatio. */
export function renderStrokes(canvas: HTMLCanvasElement, strokes: Drawable[], theme: CanvasTheme = "light") {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { scale, ox, oy } = fitWorld(width, height);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);
  for (const s of strokes) drawStroke(ctx, s, theme);
}
