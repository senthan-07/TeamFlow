import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import { config } from "../config";
import { badRequest, HttpError, notFound, param, requireUserId } from "../lib/http";
import { getMemberBoard, isMember, publicUser } from "../lib/access";
import { boardEvents } from "../lib/socket";

const removeFromDisk = (url: string) =>
  fs.unlink(path.join(config.uploadDir, path.basename(url))).catch(() => undefined);

/** GET /files/:boardId — newest first, with uploader info. */
export const getHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getMemberBoard(boardId, userId);

  const files = await prisma.file.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: publicUser } },
  });
  res.json(files);
};

/** POST /files/:boardId (multipart, field "file") */
export const sendHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  const file = req.file;
  if (!file) throw badRequest("No file uploaded");

  // Multer has already written the file, so clean it up if the user isn't allowed here.
  if (!(await isMember(boardId, userId))) {
    await removeFromDisk(file.filename);
    throw new HttpError(403, "You don't have access to this board");
  }

  const uploaded = await prisma.file.create({
    data: {
      boardId,
      userId,
      url: `/uploads/${file.filename}`,
      // Multer decodes original names as latin1; re-decode so non-ASCII names display correctly.
      filename: Buffer.from(file.originalname, "latin1").toString("utf8").slice(0, 255),
      mimetype: file.mimetype,
      size: file.size,
    },
    include: { user: { select: publicUser } },
  });

  boardEvents()?.to(boardId).emit("fileAdded", uploaded);
  res.status(201).json(uploaded);
};

/** DELETE /files/:boardId/:fileId — uploader or board owner. */
export const deleteHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  const fileId = param(req, "fileId");

  // Look the file up *within* the board so a boardId from the URL can't be used to
  // authorise deleting a file that belongs to some other board.
  const file = await prisma.file.findFirst({
    where: { id: fileId, boardId },
    include: { board: { select: { ownerId: true } } },
  });
  if (!file) throw notFound("File not found");
  if (file.userId !== userId && file.board.ownerId !== userId) {
    throw new HttpError(403, "Only the uploader or the board owner can delete this file");
  }

  await prisma.file.delete({ where: { id: fileId } });
  await removeFromDisk(file.url);

  boardEvents()?.to(boardId).emit("fileRemoved", { id: fileId });
  res.json({ message: "File deleted" });
};
