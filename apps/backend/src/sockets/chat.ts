import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initSocket = (io: Server) => {
  // Middleware 
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      socket.data.userId = decoded.id; // Attach userId to socket data
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinBoard", (boardId: string) => {
      socket.join(boardId);
      console.log(`${socket.id} joined board ${boardId}`);
      socket.emit("joinedBoard", { boardId, socketId: socket.id });
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

        io.to(boardId).emit("chatMessage", chat);
      } catch (err) {
        console.error("Chat message error:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
