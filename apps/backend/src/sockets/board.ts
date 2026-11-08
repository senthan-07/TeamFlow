import { Namespace, Server, Socket } from "socket.io";
import { inBoard, joinBoardRoom, leaveBoardRoom, SocketUser, useSocketAuth } from "../lib/socket";
import { getCallParticipants } from "./rtc";

/**
 * /board namespace: board-level awareness.
 *  - presence:      who has this board open right now
 *  - callStatus:    who's in the video call (so others can see and join)
 *  - fileAdded / fileRemoved / membersChanged / boardUpdated / boardDeleted
 *    are emitted from REST handlers via `boardEvents()`.
 */
export const initBoardSocket = (io: Server) => {
  const nsp = io.of("/board");
  useSocketAuth(nsp);

  nsp.on("connection", (socket) => {
    socket.on("joinBoard", async (boardId: unknown) => {
      const id = await joinBoardRoom(socket, boardId);
      if (!id) return;
      await broadcastPresence(nsp, id);
      socket.emit("callStatus", { participants: getCallParticipants(id) });
    });

    socket.on("leaveBoard", (boardId: unknown) => {
      if (!inBoard(socket, boardId)) return;
      leaveBoardRoom(socket, boardId);
      void broadcastPresence(nsp, boardId);
    });

    socket.on("disconnecting", () => {
      const boards = [...(socket.data.boards as Set<string>)];
      boards.forEach((b) => leaveBoardRoom(socket, b));
      boards.forEach((b) => void broadcastPresence(nsp, b));
    });
  });
};

async function broadcastPresence(nsp: Namespace, boardId: string) {
  const sockets = await nsp.in(boardId).fetchSockets();
  // One entry per user even if they have the board open in several tabs.
  const users = new Map<string, SocketUser>();
  for (const s of sockets as unknown as Socket[]) {
    users.set(s.data.userId, { userId: s.data.userId, name: s.data.name });
  }
  nsp.to(boardId).emit("presence", { users: [...users.values()] });
}
