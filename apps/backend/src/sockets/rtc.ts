import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initRTC = (io: Server) => {
  const rtcNamespace = io.of("/rtc"); 

  // Auth middleware for namespace
  rtcNamespace.use((socket: Socket, next) => {
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

  rtcNamespace.on("connection", (socket: Socket) => {
    console.log("RTC client connected:", socket.id);

    socket.on("joinRTC", async (boardId: string) => {
      const userId = socket.data.userId;
      try {
        const board = await prisma.board.findFirst({
          where: {
            id: boardId,
            OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
          },
        });

        if (!board) {
          return socket.emit("error", { message: "Access denied to board" });
        }

        socket.join(boardId);
        console.log(`${socket.id} joined RTC for board ${board.title}`);
        //optional later uncomment if needed
        // await prisma.rTCSessions.create({
        //   data: {
        //     boardId: board.id,
        //   },
        // });
        const usersInRoom = Array.from(io.of('/rtc').adapter.rooms.get(boardId) || []);
        //  usersInRoom.forEach(id => {
        //   console.log(`${id} is in room`)
        //   }
        //  );
        usersInRoom.forEach(id => {
          if (id !== socket.id) {
            socket.emit('user-joined', { socketId: id });
            socket.to(id).emit('user-joined', { socketId: socket.id });
          }
        });
        socket.emit("joinedRTC", { boardId });
      } catch (err) {
        console.error("joinRTC error:", err);
        socket.emit("error", { message: "Failed to join RTC" });
      }
    });

    socket.on("offer", ({ boardId, offer, to }) => {
      socket.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ boardId, answer, to }) => {
      socket.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ boardId, candidate, to }) => {
      socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("leaveRTC", async (boardId: string) => {
      socket.leave(boardId);
      console.log(`${socket.id} left RTC for board ${boardId}`);

      await prisma.rTCSessions.updateMany({
        where: {
          board: { id: boardId },
          endedAt: null,
        },
        data: { endedAt: new Date() },
      });
    });

    socket.on("disconnect", () => {
      console.log("RTC socket disconnected:", socket.id);
    });
  });
};
