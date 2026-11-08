import { Namespace, Server, Socket } from "socket.io";
import prisma from "../lib/prisma";
import { boardEvents, inBoard, joinBoardRoom, leaveBoardRoom, socketUser, SocketUser, useSocketAuth } from "../lib/socket";

export interface CallParticipant extends SocketUser {
  socketId: string;
  audio: boolean;
  video: boolean;
}

const MAX_PARTICIPANTS = 6; // full mesh: every peer uploads to every other peer
const activeSessions = new Map<string, string>(); // boardId -> RTCSessions.id
let rtcNsp: Namespace | null = null;

/** Who's currently in the call for a board (used for the "call in progress" badge). */
export function getCallParticipants(boardId: string): CallParticipant[] {
  const ids = rtcNsp?.adapter.rooms.get(boardId);
  if (!ids || !rtcNsp) return [];
  return [...ids].flatMap((id) => {
    const s = rtcNsp!.sockets.get(id);
    return s ? [participant(s)] : [];
  });
}

function participant(s: Socket): CallParticipant {
  return { socketId: s.id, ...socketUser(s), audio: s.data.audio ?? true, video: s.data.video ?? true };
}

function broadcastCallStatus(boardId: string) {
  boardEvents()?.to(boardId).emit("callStatus", { participants: getCallParticipants(boardId) });
}

export const initRTC = (io: Server) => {
  const nsp = io.of("/rtc");
  rtcNsp = nsp;
  useSocketAuth(nsp);

  /** Both sockets must be in the same call room, so you can't signal arbitrary sockets. */
  const sameCall = (socket: Socket, boardId: unknown, to: unknown): to is string =>
    inBoard(socket, boardId) && typeof to === "string" && !!nsp.sockets.get(to)?.rooms.has(boardId);

  const leaveCall = async (socket: Socket, boardId: string) => {
    leaveBoardRoom(socket, boardId);
    socket.to(boardId).emit("rtc-peer-left", { socketId: socket.id });
    broadcastCallStatus(boardId);

    if ((nsp.adapter.rooms.get(boardId)?.size ?? 0) === 0) {
      const sessionId = activeSessions.get(boardId);
      activeSessions.delete(boardId);
      if (sessionId) {
        await prisma.rTCSessions.update({ where: { id: sessionId }, data: { endedAt: new Date() } }).catch(() => undefined);
      }
    }
  };

  nsp.on("connection", (socket) => {
    socket.on("joinRTC", async (payload: unknown) => {
      // Accept either "boardId" or { boardId, audio, video }.
      const opts = typeof payload === "string" ? { boardId: payload } : ((payload ?? {}) as Record<string, unknown>);
      const boardId = opts.boardId;
      try {
        if (typeof boardId !== "string") return;
        const existing = getCallParticipants(boardId);
        if (existing.length >= MAX_PARTICIPANTS) {
          socket.emit("rtc-error", { message: `Calls are limited to ${MAX_PARTICIPANTS} people` });
          return;
        }
        socket.data.audio = opts.audio !== false;
        socket.data.video = opts.video !== false;
        if (!(await joinBoardRoom(socket, boardId))) return;

        if (existing.length === 0) {
          const session = await prisma.rTCSessions.create({ data: { boardId } });
          activeSessions.set(boardId, session.id);
        }

        // The newcomer initiates an offer to each existing peer; existing peers just answer.
        socket.emit("rtc-peers", { peers: existing.filter((p) => p.socketId !== socket.id) });
        socket.to(boardId).emit("rtc-peer-joined", participant(socket));
        broadcastCallStatus(boardId);
      } catch (err) {
        console.error("joinRTC error:", err);
        socket.emit("rtc-error", { message: "Failed to join the call" });
      }
    });

    socket.on("offer", ({ boardId, to, offer }: Record<string, unknown> = {}) => {
      if (sameCall(socket, boardId, to)) nsp.to(to).emit("offer", { from: socket.id, offer, peer: participant(socket) });
    });

    socket.on("answer", ({ boardId, to, answer }: Record<string, unknown> = {}) => {
      if (sameCall(socket, boardId, to)) nsp.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ boardId, to, candidate }: Record<string, unknown> = {}) => {
      if (sameCall(socket, boardId, to)) nsp.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    // Mute / camera-off indicators.
    socket.on("media-state", ({ boardId, audio, video }: Record<string, unknown> = {}) => {
      if (!inBoard(socket, boardId)) return;
      socket.data.audio = Boolean(audio);
      socket.data.video = Boolean(video);
      socket.to(boardId).emit("media-state", { socketId: socket.id, audio: socket.data.audio, video: socket.data.video });
      broadcastCallStatus(boardId);
    });

    socket.on("leaveRTC", (boardId: unknown) => {
      if (inBoard(socket, boardId)) void leaveCall(socket, boardId);
    });

    socket.on("disconnecting", () => {
      for (const boardId of socket.data.boards as Set<string>) void leaveCall(socket, boardId);
    });
  });
};

/** Close any open sessions (on shutdown, or rows left open by a previous crash). */
export async function endOpenSessions() {
  await prisma.rTCSessions.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } });
}
