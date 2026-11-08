import { Namespace, Server, Socket } from "socket.io";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { inBoard, joinBoardRoom, leaveBoardRoom, socketUser, useSocketAuth } from "../lib/socket";

/**
 * A stroke in world coordinates (the client maps its canvas to a fixed world size,
 * so strokes line up for everyone regardless of screen size).
 * `points` is flat: [x0, y0, x1, y1, ...].
 */
export interface Stroke {
  id: string;
  userId: string;
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  size: number;
  points: number[];
}

const MAX_POINTS = 8000; // numbers per stroke (= 4000 points)
const MAX_STROKES = 5000; // per board
const SAVE_DEBOUNCE_MS = 1500;
const TOOLS = new Set(["pen", "highlighter", "eraser"]);
const COLOR_RE = /^#[0-9a-f]{3,8}$/i;

interface BoardCanvas {
  strokes: Stroke[];
  timer: NodeJS.Timeout | null;
}

const canvases = new Map<string, BoardCanvas>();
const loading = new Map<string, Promise<BoardCanvas>>();
let drawNsp: Namespace | null = null;

/** Accepts both the new stroke shape and the legacy `{x, y}[][]` format. */
function normaliseStored(data: unknown): Stroke[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item, i): Stroke[] => {
    if (Array.isArray(item)) {
      const points = item.flatMap((p: { x?: number; y?: number }) =>
        typeof p?.x === "number" && typeof p?.y === "number" ? [p.x, p.y] : [],
      );
      return points.length ? [{ id: `legacy-${i}`, userId: "", tool: "pen", color: "#1c1917", size: 3, points }] : [];
    }
    return item && typeof item === "object" && Array.isArray((item as Stroke).points) ? [item as Stroke] : [];
  });
}

async function getCanvas(boardId: string): Promise<BoardCanvas> {
  const cached = canvases.get(boardId);
  if (cached) return cached;
  // Coalesce concurrent loads so two users joining at once don't race.
  let pending = loading.get(boardId);
  if (!pending) {
    pending = prisma.drawing
      .findUnique({ where: { boardId } })
      .then((row) => {
        const canvas = { strokes: normaliseStored(row?.data), timer: null };
        canvases.set(boardId, canvas);
        return canvas;
      })
      .finally(() => loading.delete(boardId));
    loading.set(boardId, pending);
  }
  return pending;
}

async function persist(boardId: string) {
  const canvas = canvases.get(boardId);
  if (!canvas) return;
  if (canvas.timer) clearTimeout(canvas.timer);
  canvas.timer = null;
  const data = canvas.strokes as unknown as Prisma.InputJsonValue;
  try {
    await prisma.drawing.upsert({ where: { boardId }, update: { data }, create: { boardId, data } });
  } catch (err) {
    // P2003: the board was deleted while a save was pending. Nothing to keep.
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003")) {
      console.error(`Failed to save drawing for ${boardId}:`, err);
    }
  }
}

function scheduleSave(boardId: string) {
  const canvas = canvases.get(boardId);
  if (!canvas) return;
  if (canvas.timer) clearTimeout(canvas.timer);
  canvas.timer = setTimeout(() => void persist(boardId), SAVE_DEBOUNCE_MS);
}

function parseStroke(raw: unknown, userId: string): Stroke | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<Stroke>;
  if (typeof s.id !== "string" || s.id.length > 64) return null;
  if (!Array.isArray(s.points) || s.points.length < 2 || s.points.length > MAX_POINTS || s.points.length % 2) return null;
  if (!s.points.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return {
    id: s.id,
    userId,
    tool: TOOLS.has(s.tool as string) ? (s.tool as Stroke["tool"]) : "pen",
    color: typeof s.color === "string" && COLOR_RE.test(s.color) ? s.color : "#1c1917",
    size: Math.min(Math.max(Number(s.size) || 3, 1), 80),
    // Round to 1 decimal: halves the JSON size with no visible difference.
    points: s.points.map((n) => Math.round(n * 10) / 10),
  };
}

// ---- Helpers used by REST handlers ---------------------------------------------------

export async function loadStrokes(boardId: string) {
  return (await getCanvas(boardId)).strokes;
}

export async function clearDrawing(boardId: string) {
  const canvas = await getCanvas(boardId);
  canvas.strokes = [];
  await persist(boardId);
  drawNsp?.to(boardId).emit("canvasCleared");
}

/** Drop in-memory state (board deleted) so a pending save doesn't resurrect it. */
export function forgetDrawing(boardId: string) {
  const canvas = canvases.get(boardId);
  if (canvas?.timer) clearTimeout(canvas.timer);
  canvases.delete(boardId);
}

/** Write every unsaved canvas. Called on shutdown. */
export async function flushAllDrawings() {
  await Promise.all([...canvases.entries()].filter(([, c]) => c.timer).map(([id]) => persist(id)));
}

// ---- Socket namespace ----------------------------------------------------------------

export const initDrawSocket = (io: Server) => {
  const nsp = io.of("/draw");
  drawNsp = nsp;
  useSocketAuth(nsp);

  const handleLeave = async (socket: Socket, boardId: string) => {
    socket.to(boardId).emit("cursorLeave", { userId: socket.data.userId });
    leaveBoardRoom(socket, boardId);
    // Last person out: save now and free the memory.
    const remaining = nsp.adapter.rooms.get(boardId)?.size ?? 0;
    if (remaining === 0 && canvases.has(boardId)) {
      await persist(boardId);
      canvases.delete(boardId);
    }
  };

  nsp.on("connection", (socket) => {
    const me = socketUser(socket);

    socket.on("joinBoard", async (boardId: unknown) => {
      try {
        const id = await joinBoardRoom(socket, boardId);
        if (!id) return;
        const { strokes } = await getCanvas(id);
        socket.emit("initialDrawing", { strokes });
      } catch (err) {
        console.error("draw joinBoard error:", err);
        socket.emit("error", { message: "Failed to load the canvas" });
      }
    });

    socket.on("newStroke", async ({ boardId, stroke }: { boardId: unknown; stroke: unknown } = {} as never) => {
      if (!inBoard(socket, boardId)) return;
      const parsed = parseStroke(stroke, me.userId);
      if (!parsed) return;
      const canvas = await getCanvas(boardId);
      if (canvas.strokes.length >= MAX_STROKES) {
        socket.emit("error", { message: "This board is full. Clear some strokes to keep drawing." });
        return;
      }
      canvas.strokes.push(parsed);
      scheduleSave(boardId);
      socket.to(boardId).emit("newStroke", parsed);
    });

    // Live in-progress stroke so others watch you draw. Not persisted; dropped if congested.
    socket.on("strokePreview", ({ boardId, stroke }: { boardId: unknown; stroke: unknown } = {} as never) => {
      if (!inBoard(socket, boardId)) return;
      const parsed = parseStroke(stroke, me.userId);
      if (parsed) socket.volatile.to(boardId).emit("strokePreview", parsed);
    });

    // Undo: you can remove your own strokes (the owner can remove anyone's).
    socket.on("removeStroke", async ({ boardId, strokeId }: { boardId: unknown; strokeId: unknown } = {} as never) => {
      if (!inBoard(socket, boardId) || typeof strokeId !== "string") return;
      const canvas = await getCanvas(boardId);
      const idx = canvas.strokes.findIndex((s) => s.id === strokeId);
      if (idx === -1) return;
      const isOwner = await prisma.board.count({ where: { id: boardId, ownerId: me.userId } });
      if (canvas.strokes[idx].userId !== me.userId && !isOwner) return;
      canvas.strokes.splice(idx, 1);
      scheduleSave(boardId);
      nsp.to(boardId).emit("strokeRemoved", { id: strokeId });
    });

    socket.on("clearCanvas", async ({ boardId }: { boardId: unknown } = {} as never) => {
      if (!inBoard(socket, boardId)) return;
      const isOwner = await prisma.board.count({ where: { id: boardId, ownerId: me.userId } });
      if (!isOwner) {
        socket.emit("error", { message: "Only the board owner can clear the canvas" });
        return;
      }
      await clearDrawing(boardId);
    });

    socket.on("cursorMove", ({ boardId, position }: { boardId: unknown; position?: { x?: unknown; y?: unknown } } = {} as never) => {
      if (!inBoard(socket, boardId)) return;
      const x = Number(position?.x);
      const y = Number(position?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      socket.volatile.to(boardId).emit("cursorMove", { ...me, position: { x, y } });
    });

    socket.on("leaveBoard", (boardId: unknown) => {
      if (inBoard(socket, boardId)) void handleLeave(socket, boardId);
    });

    socket.on("disconnecting", () => {
      for (const boardId of socket.data.boards as Set<string>) void handleLeave(socket, boardId);
    });
  });
};
