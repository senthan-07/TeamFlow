import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initDrawSocket = (io: Server) => {
  const drawNamespace = io.of("/draw");

  // Middleware to authenticate socket for /draw namespace
  drawNamespace.use((socket: Socket, next) => {
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

  drawNamespace.on("connection", (socket: Socket) => {
    console.log("Draw socket connected:", socket.id);

    socket.on("joinBoard", async (boardId: string) => {
      try {
        const userId = socket.data.userId;

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
          return socket.emit("error", { message: "Board not found or access denied" });
        }

        socket.join(boardId);
        console.log(`${socket.id} joined drawing board ${boardId}`);
        socket.emit("joinedBoard", { boardId });

        const drawing = await prisma.drawing.findUnique({
          where: { boardId },
        });

        if (drawing) {
          socket.emit("initialDrawing", drawing.data);
        }
      } catch (err) {
        console.error("joinBoard (draw) error:", err);
        socket.emit("error", { message: "Failed to join board" });
      }
    });

    socket.on("newStroke", async ({ boardId, path }) => {
      const userId = socket.data.userId;

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
        return socket.emit("error", { message: "Unauthorized drawing action" });
      }

      // Broadcast the drawing path to others in the same board room
      socket.to(boardId).emit("newStroke", path);
      console.log(`${userId} path = ${path}`)
    });

    socket.on("cursorMove", ({ boardId, position }) => {
      const userId = socket.data.userId;
      socket.to(boardId).emit("cursorMove", { userId, position });
      console.log(`${userId} position = ${position}`)
    });

    socket.on("saveDrawing", async ({ boardId, data }) => {
      const userId = socket.data.userId;

      try {
        const board = await prisma.board.findFirst({
          where: {
            id : boardId,
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

        console.log(`Saved drawing for board ${board.title}`);
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
