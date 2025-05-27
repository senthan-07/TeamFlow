import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initDrawSocket = (io: Server) => {
  // Middleware to authenticate socket
  io.use((socket: Socket, next) => {
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

  io.on("connection", (socket: Socket) => {
    console.log("Draw socket connected:", socket.id);

    socket.on("joinBoard", async (boardTitle: string) => {
      try {
        const userId = socket.data.userId;

        const board = await prisma.board.findFirst({
          where: {
            title: boardTitle,
            OR: [
              { ownerId: userId },
              { users: { some: { id: userId } } },
            ],
          },
        });

        if (!board) {
          return socket.emit("error", { message: "Board not found or access denied" });
        }

        socket.join(boardTitle);
        console.log(`${socket.id} joined drawing board ${boardTitle}`);
        socket.emit("joinedBoard", { boardTitle });
      } catch (err) {
        console.error("joinBoard (draw) error:", err);
        socket.emit("error", { message: "Failed to join board" });
      }
    });

    socket.on("drawing", async ({ boardTitle, path }) => {
      const userId = socket.data.userId;

      const board = await prisma.board.findFirst({
        where: {
          title: boardTitle,
          OR: [
            { ownerId: userId },
            { users: { some: { id: userId } } },
          ],
        },
      });

      if (!board) {
        return socket.emit("error", { message: "Unauthorized drawing action" });
      }

      // Broadcast the drawing path to others
      socket.to(boardTitle).emit("drawing", path);
    });

    socket.on("cursorMove", ({ boardTitle, position }) => {
      const userId = socket.data.userId;
      socket.to(boardTitle).emit("cursorMove", { userId, position });
    });

    socket.on("saveDrawing", async ({ boardTitle, data }) => {
    const userId = socket.data.userId;

    try {
        const board = await prisma.board.findFirst({
        where: {
            title: boardTitle,
            OR: [
            { ownerId: userId },
            { users: { some: { id: userId } } },
            ],
        },
        });

        if (!board) {
        return socket.emit("error", { message: "Unauthorized save action" });
        }

        await prisma.drawing.upsert({
        where: { boardId: board.id },
        update: { data },
        create: {
            boardId: board.id,
            data,
        },
        });

        console.log(`Saved drawing for board ${boardTitle}`);
    } catch (error) {
        console.error("saveDrawing error:", error);
        socket.emit("error", { message: "Failed to save drawing" });
    }
    });


    socket.on("disconnect", () => {
      console.log("Draw socket disconnected:", socket.id);
    });
  });
};
