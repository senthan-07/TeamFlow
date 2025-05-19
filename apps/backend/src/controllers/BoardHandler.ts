import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();


const newBoardHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { title, userEmails = [] } = req.body;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const users = await prisma.user.findMany({
      where: {
        email: { in: userEmails },
      },
      select: { id: true },
    });

    const userIds = users.map((user: { id: string }) => user.id);

    // 2. Create the board with connected users
    const board = await prisma.board.create({
      data: {
        title,
        ownerId: userId,
        users: {
          connect: userIds.map((id: string) => ({ id })),
        },
      },
      include: {
        users: true,
        owner: true,
      },
    });

    return res.status(201).json(board);
  } catch (err) {
    console.error("newBoardHandler error:", err);
    return res.status(500).json({ error: "Failed to create board" });
  }
};


const getBoardHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { boardId } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!boardId) return res.status(400).json({ error: "Board ID is required" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { users: { some: { id: userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        users: { select: { id: true, name: true, email: true } },
        drawings: true,
        chats: true,
        files: true,
        rtcSessions: true,
      },
    });

    if (!board) {
      return res.status(404).json({ error: "Board not found or access denied" });
    }

    return res.json(board);
  } catch (err) {
    console.error("getBoardHandler error:", err);
    return res.status(500).json({ error: "Failed to fetch board" });
  }
};

//To get users present in a board
const BoardUserHandler = async(req:Request,res:Response)=>{
  const userId = req.userId;
  const { boardId } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { users: { some: { id: userId } } },
        ],
      },
      select: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!board) {
      return res.status(404).json({ error: "Board not found or access denied" });
    }

    return res.json(board.users);
  } catch (err) {
    console.error("BoardUserHandler error:", err);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}

//Add users to board by owner
const InviteHandler = async(req:Request,res:Response)=>{
  const userId = req.userId;
  const { boardId } = req.params;
  const { email } = req.body;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return res.status(403).json({ error: "Only the owner can invite users" });
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } });

    if (!userToInvite) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.board.update({
      where: { id: boardId },
      data: {
        users: {
          connect: { id: userToInvite.id },
        },
      },
    });

    return res.status(200).json({ message: "User invited successfully" });
  } catch (err) {
    console.error("InviteHandler error:", err);
    return res.status(500).json({ error: "Failed to invite user" });
  }
}

const updateHandler = async(req:Request,res:Response)=>{
  const userId = req.userId;
  const { boardId } = req.params;
  const { title } = req.body;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return res.status(403).json({ error: "Only the owner can update the board" });
    }

    const updated = await prisma.board.update({
      where: { id: boardId },
      data: { title },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error("updateHandler error:", err);
    return res.status(500).json({ error: "Failed to update board" });
  }
}

const DeletHandler = async(req:Request,res:Response)=>{
  const userId = req.userId;
  const { boardId } = req.params;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        ownerId: userId,
      },
    });

    if (!board) {
      return res.status(403).json({ error: "Only the owner can delete the board" });
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    return res.status(200).json({ message: "Board deleted successfully" });
  } catch (err) {
    console.error("DeletHandler error:", err);
    return res.status(500).json({ error: "Failed to delete board" });
  }
}

export {newBoardHandler,getBoardHandler,BoardUserHandler,InviteHandler,updateHandler,DeletHandler}