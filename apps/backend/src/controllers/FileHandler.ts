import { PrismaClient } from "@prisma/client";
import { upload } from "../middlewares/multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { Request , Response } from "express";
dotenv.config();

interface UploadRequest extends Request {
  file?: Express.Multer.File;
  userId?: string;
  body: {
    title: string;
  };
}


const prisma = new PrismaClient();

//Get all files from board
const getHandler = async (req: Request<{ title: string }>, res: Response) => {
  const { title } = req.params;
  const userId = req.userId;

  const board = await prisma.board.findFirst({
    where: {
      title,
      OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
    },
  });

  if (!board) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const files = await prisma.file.findMany({
    where: { boardId: board.id },
  });

  res.json(files);
};


//Upload files
const sendHandler = async (req: UploadRequest, res: Response) => {
  const userId = req.userId;
  const { title } = req.body;
  const file = req.file;

  if(!userId){
    res.status(400).json({ error: "No username found" });
    return;
  }

  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const board = await prisma.board.findFirst({
    where: {
      title,
      OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
    },
  });

  if (!board) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const uploaded = await prisma.file.create({
    data: {
      boardId: board.id,
      userId,
      url: `/uploads/${file.filename}`, // Local dev URL
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    },
  });

  res.status(201).json(uploaded);
};



const deleteHandler = async (req: Request<{ title: string; id: string }>,res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const file = await prisma.file.findUnique({ where: { id } });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check ownership
    const board = await prisma.board.findUnique({
      where: { id: file.boardId },
      select: { ownerId: true },
    });

    // Only file uploader or board owner can delete
    if (file.userId !== userId && board?.ownerId !== userId) {
      res.status(403).json({ error: "Not authorized to delete this file" });
      return;
    }

    // Delete file from disk 
    const filePath = path.join("uploads", path.basename(file.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn("File not found on disk:", filePath);
    }

    // Delete from database
    await prisma.file.delete({ where: { id } });
    res.status(200).json({ message: "File deleted successfully" });

  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};



export {getHandler,sendHandler,deleteHandler}