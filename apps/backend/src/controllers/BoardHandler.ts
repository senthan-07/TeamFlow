import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

const prisma = new PrismaClient();

const getAllBoardHandler = async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId! },   // User is the owner
          { users: { some: { id: userId } } },  // User is part of the board
        ],
      },
      select: {
        id: true,        // board id
        title: true,     // board title
        owner: {         // owner fields
          select: {
            id: true,    // owner id
            name: true,  //  owner name
          },
        },
      },
    });

    if (boards.length === 0) {
      res.status(404).json({ error: "No boards found or access denied" });
      return;
    }

    res.json(boards);
  } catch (err) {
    console.error("getAllBoardsHandler error:", err);
    res.status(500).json({ error: "Failed to fetch boards" });
    return;
  }
};




const newBoardHandler = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { title, userEmails = [] } = req.body;

  if (!userId) res.status(401).json({ error: "Unauthorized" });
  // console.log(userId);

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
        ownerId: userId!,
        users: {
          connect: userIds.map((id: string) => ({ id })),
        },
      },
      include: {
        users: true,
        owner: true,
      },
    });

    res.status(201).json(board);
  } catch (err) {
    console.error("newBoardHandler error:", err);
    res.status(500).json({ error: "Failed to create board" });
  }
};


const getBoardHandler = async (req: Request<{title:string}>, res: Response) => {
  const userId = req.userId;
  const { title } = req.params;

  if (!userId) res.status(401).json({ error: "Unauthorized" });
  if (!title) res.status(400).json({ error: "Board Name is required" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        title: title,
        OR: [
          { ownerId: userId! },
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
      res.status(404).json({ error: "Board not found or access denied" });
    }

    res.json(board);
  } catch (err) {
    console.error("getBoardHandler error:", err);
    res.status(500).json({ error: "Failed to fetch board" });
  }
};

//To get users present in a board
const BoardUserHandler = async (req: Request<{ title: string }>,res: Response) => {
  const userId = req.userId;
  const { title } = req.params;

  if (!userId) res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        title: title, // or use slug if implemented
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
      res.status(404).json({ error: "Board not found or access denied" });
    }

    res.json(board!.users);
  } catch (err) {
    console.error("BoardUserHandler error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

//Add users to board by owner
const InviteHandler = async(req:Request<{title:string}>,res:Response)=>{
  const userId = req.userId;
  const { title , email } = req.body;
  // console.log(email)

  if (!userId) res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        title: title,
        ownerId: userId!,
      },
    });

    if (!board) {
      res.status(403).json({ error: "Only the owner can invite users" });
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } });

    if (!userToInvite) {
      res.status(404).json({ error: "User not found" });
    }

    await prisma.board.update({
      where: { title: title },
      data: {
        users: {
          connect: { id: userToInvite!.id },
        },
      },
    });

    res.status(200).json({ message: "User invited successfully" });
  } catch (err) {
    console.error("InviteHandler error:", err);
    res.status(500).json({ error: "Failed to invite user" });
  }
}

const updateHandler = async(req:Request<{title:string}>,res:Response)=>{
  const userId = req.userId;
  const { title } = req.params;

  if (!userId) res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        title: title,
        ownerId: userId!,
      },
    });

    if (!board) {
      res.status(403).json({ error: "Only the owner can update the board" });
    }

    const updated = await prisma.board.update({
      where: { title: title },
      data: { title },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("updateHandler error:", err);
    res.status(500).json({ error: "Failed to update board" });
  }
}

const DeletHandler = async(req:Request<{title:string}>,res:Response)=>{
  const userId = req.userId;
  const { title } = req.params;

  if (!userId) res.status(401).json({ error: "Unauthorized" });

  try {
    const board = await prisma.board.findFirst({
      where: {
        title: title,
        ownerId: userId!,
      },
    });

    if (!board) {
      res.status(403).json({ error: "Only the owner can delete the board" });
    }

    await prisma.board.delete({
      where: { title: title },
    });

    res.status(200).json({ message: "Board deleted successfully" });
  } catch (err) {
    console.error("DeletHandler error:", err);
    res.status(500).json({ error: "Failed to delete board" });
  }
}

export {getAllBoardHandler,newBoardHandler,getBoardHandler,BoardUserHandler,InviteHandler,updateHandler,DeletHandler}