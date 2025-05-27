import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const initRTC = (io: Server) => {
  // Auth middleware
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
    console.log("RTC client connected:", socket.id);

    socket.on("joinRTC", async (boardTitle: string) => {
      const userId = socket.data.userId;
      try {
        const board = await prisma.board.findFirst({
          where: {
            title: boardTitle,
            OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
          },
        });

        if (!board) {
          return socket.emit("error", { message: "Access denied to board" });
        }

        socket.join(boardTitle);
        console.log(`${socket.id} joined RTC for board ${boardTitle}`);

        // Start session in DB (optional)
        await prisma.rTCSessions.create({
          data: {
            boardId: board.id,
          },
        });

        socket.emit("joinedRTC", { boardTitle });
      } catch (err) {
        console.error("joinRTC error:", err);
        socket.emit("error", { message: "Failed to join RTC" });
      }
    });

    //initiate connection
    socket.on("offer", ({ boardTitle, offer, to }) => {
      socket.to(to).emit("offer", { from: socket.id, offer });
    });


    //Response to initialization
    socket.on("answer", ({ boardTitle, answer, to }) => {
      socket.to(to).emit("answer", { from: socket.id, answer });
    });


    //To find best NAT path 
    socket.on("ice-candidate", ({ boardTitle, candidate, to }) => {
      socket.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("leaveRTC", async (boardTitle: string) => {
      socket.leave(boardTitle);
      console.log(`${socket.id} left RTC for board ${boardTitle}`);

      // Optional: update session end time
      await prisma.rTCSessions.updateMany({
        where: {
          board: { title: boardTitle },
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
