import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initChatSocket = (io: Server) => {
  const chatNamespace = io.of("/chat");

  // Middleware for /chat namespace
  chatNamespace.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  chatNamespace.on("connection", (socket: Socket) => {
    console.log("New client connected to chat:", socket.id);

    socket.on("joinBoard", async (boardId: string) => {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
      });

      if (!board) {
        return socket.emit("error", { message: "Board not found" });
      }

      socket.join(boardId);
      console.log(`${socket.id} joined chat board ${boardId}`);
      socket.emit("joinedBoard", { boardId, socketId: socket.id });

      const messages = await prisma.chat.findMany({
        where: { boardId },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });

      socket.emit("initialMessages", messages);
    });

    socket.on("chatMessage", async ({ boardId, message }: { boardId: string; message: string }) => {
      const userId = socket.data.userId;
      if (!userId) {
        return socket.emit("error", { message: "Unauthorized" });
      }

      try {
        const board = await prisma.board.findFirst({
          where: {
            id: boardId,
            OR: [
              { ownerId: userId },
              { users: { some: { id: userId } } },
            ],
          },
        });

        if (!board) {
          return socket.emit("error", { message: "You're not a member of this board" });
        }

        const chat = await prisma.chat.create({
          data: {
            boardId,
            userId,
            message,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        chatNamespace.to(boardId).emit("chatMessage", chat);
      } catch (err) {
        console.error("Chat message error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("leaveBoard", (boardId: string) => {
      socket.leave(boardId);
      console.log(`${socket.id} left chat board ${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from chat:", socket.id);
    });
  });
};
