import { Namespace, Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config";
import prisma from "./prisma";
import { isMember } from "./access";

export interface SocketUser {
  userId: string;
  name: string;
}

let ioRef: Server | null = null;

export function setIO(io: Server) {
  ioRef = io;
}

/** Lets REST handlers push realtime events (e.g. "a file was uploaded"). */
export function boardEvents() {
  return ioRef?.of("/board");
}

/**
 * Shared handshake auth for every namespace: verifies the JWT and loads the
 * display name once, so per-event handlers never hit the DB just to know who is talking.
 */
export function useSocketAuth(nsp: Namespace) {
  nsp.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true },
      });
      if (!user) return next(new Error("Unauthorized"));
      socket.data.userId = user.id;
      socket.data.name = user.name || user.email.split("@")[0];
      socket.data.boards = new Set<string>();
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });
}

/**
 * Verifies membership once and caches it on the socket. Later events for the same board
 * are checked against the cache (`inBoard`) instead of querying Postgres on every stroke.
 */
export async function joinBoardRoom(socket: Socket, boardId: unknown): Promise<string | null> {
  if (typeof boardId !== "string") return null;
  if (!(await isMember(boardId, socket.data.userId))) {
    socket.emit("error", { message: "Board not found or access denied" });
    return null;
  }
  socket.join(boardId);
  (socket.data.boards as Set<string>).add(boardId);
  return boardId;
}

export function inBoard(socket: Socket, boardId: unknown): boardId is string {
  return typeof boardId === "string" && (socket.data.boards as Set<string>).has(boardId);
}

export function leaveBoardRoom(socket: Socket, boardId: string) {
  socket.leave(boardId);
  (socket.data.boards as Set<string>).delete(boardId);
}

export function socketUser(socket: Socket): SocketUser {
  return { userId: socket.data.userId, name: socket.data.name };
}
