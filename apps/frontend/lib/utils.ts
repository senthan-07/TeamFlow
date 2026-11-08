import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Marker colours, one per collaborator. Order matters: it's what users see first. */
export const MARKERS = [
  { name: "Ultramarine", hex: "#2f4bd8" },
  { name: "Vermilion", hex: "#d9432a" },
  { name: "Emerald", hex: "#0e8a6a" },
  { name: "Plum", hex: "#8b3fa8" },
  { name: "Teal", hex: "#17839a" },
  { name: "Amber", hex: "#b7791f" },
] as const;

/** Stable marker colour for a user id (same person, same colour, everywhere). */
export function markerFor(id: string | undefined | null): string {
  if (!id) return MARKERS[0].hex;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return MARKERS[Math.abs(hash) % MARKERS.length].hex;
}

export function initials(name?: string | null, email?: string | null): string {
  const source = (name || email?.split("@")[0] || "?").trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function displayName(user?: { name?: string | null; email?: string | null } | null): string {
  return user?.name?.trim() || user?.email?.split("@")[0] || "Someone";
}

/** Server error message from an axios error, falling back to a sensible default. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
  const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
  if (e?.response?.data?.error) return e.response.data.error;
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.message === "Network Error") return "Can't reach the server. Check your connection.";
  return fallback;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago" */
export function timeAgo(date: string | number | Date): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  if (Math.abs(seconds) < 45) return "just now";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size || unit === "minute") return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function clockTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Short random id for strokes and optimistic messages. */
export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
