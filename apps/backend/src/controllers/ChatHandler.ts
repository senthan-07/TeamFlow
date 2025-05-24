import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { Request, Response } from "express";
dotenv.config();

const prisma = new PrismaClient();

// Get Board Chat History
const getHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { title } = req.params as { title: string };

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const board = await prisma.board.findFirst({
      where: {
        title,
        OR: [
          { ownerId: userId },
          { users: { some: { id: userId } } },
        ],
      },
    });

    if (!board) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const messages = await prisma.chat.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(messages);
    return;
  } catch (err) {
    console.error("getMessagesHandler error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
    return;
  }
};

// Send a Chat Message
// const sendHandler = async (req: Request, res: Response) => {
//   const userId = req.userId;
//   const { title } = req.params as { title: string };
//   const { message } = req.body;

//   if (!userId) {
//     res.status(401).json({ error: "Unauthorized" });
//     return;
//   }

//   if (!message) {
//     res.status(400).json({ error: "Message is required" });
//     return;
//   }

//   try {
//     const board = await prisma.board.findUnique({ where: { title } });
//     if (!board) {
//       res.status(404).json({ error: "Board not found" });
//       return;
//     }

//     const chat = await prisma.chat.create({
//       data: {
//         boardId: board.id,
//         userId: userId,
//         message,
//       },
//       include: {
//         user: { select: { id: true, name: true, email: true } },
//       },
//     });

//     res.status(201).json(chat);
//     return;
//   } catch (err) {
//     console.error("sendMessageHandler error:", err);
//     res.status(500).json({ error: "Failed to send message" });
//     return;
//   }
// };

// Delete All Chat for a Board
const deleteHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { title } = req.body as { title: string };

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const board = await prisma.board.findFirst({
      where: {
        title,
        ownerId: userId,
      },
    });

    if (!board) {
      res.status(403).json({ error: "Only the owner can delete the chat" });
      return;
    }

    await prisma.chat.deleteMany({
      where: { boardId: board.id },
    });

    res.status(200).json({ message: "Chat deleted successfully" });
    return;
  } catch (err) {
    console.error("deleteHandler error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

export { getHandler, deleteHandler };
