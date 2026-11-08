import { Server } from "socket.io";
import prisma from "../lib/prisma";
import { publicUser } from "../lib/access";
import { inBoard, joinBoardRoom, leaveBoardRoom, socketUser, useSocketAuth } from "../lib/socket";

const PAGE_SIZE = 50;
const MAX_LENGTH = 2000;

type Ack = (res: { ok: true; message: unknown } | { ok: false; error: string }) => void;

export const initChatSocket = (io: Server) => {
  const nsp = io.of("/chat");
  useSocketAuth(nsp);

  nsp.on("connection", (socket) => {
    const me = socketUser(socket);

    socket.on("joinBoard", async (boardId: unknown) => {
      try {
        // Previously anyone with a valid token could join any board's chat. Not any more.
        const id = await joinBoardRoom(socket, boardId);
        if (!id) return;

        // Only the latest page; older messages come from GET /chat/:boardId?before=...
        const latest = await prisma.chat.findMany({
          where: { boardId: id },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: PAGE_SIZE + 1,
          include: { user: { select: publicUser } },
        });
        socket.emit("initialMessages", {
          messages: latest.slice(0, PAGE_SIZE).reverse(),
          hasMore: latest.length > PAGE_SIZE,
        });
      } catch (err) {
        console.error("chat joinBoard error:", err);
        socket.emit("error", { message: "Failed to load chat" });
      }
    });

    socket.on("chatMessage", async (payload: { boardId?: unknown; message?: unknown } = {}, ack?: Ack) => {
      const reply: Ack = typeof ack === "function" ? ack : () => undefined;
      const { boardId } = payload;
      const text = typeof payload.message === "string" ? payload.message.trim() : "";

      if (!inBoard(socket, boardId)) return reply({ ok: false, error: "Join the board first" });
      if (!text) return reply({ ok: false, error: "Message is empty" });
      if (text.length > MAX_LENGTH) return reply({ ok: false, error: `Messages are limited to ${MAX_LENGTH} characters` });

      try {
        const chat = await prisma.chat.create({
          data: { boardId, userId: me.userId, message: text },
          include: { user: { select: publicUser } },
        });
        nsp.to(boardId).emit("chatMessage", chat);
        reply({ ok: true, message: chat });
      } catch (err) {
        console.error("chatMessage error:", err);
        reply({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("typing", ({ boardId, isTyping }: { boardId?: unknown; isTyping?: unknown } = {}) => {
      if (!inBoard(socket, boardId)) return;
      socket.volatile.to(boardId).emit("typing", { ...me, isTyping: Boolean(isTyping) });
    });

    socket.on("leaveBoard", (boardId: unknown) => {
      if (inBoard(socket, boardId)) leaveBoardRoom(socket, boardId);
    });
  });
};
