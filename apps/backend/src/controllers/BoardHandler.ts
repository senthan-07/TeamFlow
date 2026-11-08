import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import prisma from "../lib/prisma";
import { config } from "../config";
import { badRequest, notFound, param, requireUserId, HttpError } from "../lib/http";
import { getMemberBoard, getOwnedBoard, memberOf, publicUser } from "../lib/access";
import { boardEvents } from "../lib/socket";
import { forgetDrawing } from "../sockets/draw";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseTitle(raw: unknown): string {
  const title = typeof raw === "string" ? raw.trim() : "";
  if (!title) throw badRequest("Board title is required");
  if (title.length > 80) throw badRequest("Board title must be 80 characters or fewer");
  return title;
}

function parseEmails(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const emails = raw
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
  return [...new Set(emails)].slice(0, 50);
}

/** GET /board/all — every board the user owns or collaborates on, most recently active first. */
export const getAllBoardHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);

  const boards = await prisma.board.findMany({
    where: memberOf(userId),
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: publicUser },
      users: { select: publicUser },
      drawings: { select: { updatedAt: true } },
      chats: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { chats: true, files: true } },
    },
  });

  const result = boards
    .map(({ drawings, chats, ...board }) => {
      const times = [board.updatedAt, drawings[0]?.updatedAt, chats[0]?.createdAt].filter(Boolean) as Date[];
      const lastActivity = new Date(Math.max(...times.map((t) => t.getTime())));
      return { ...board, lastActivity, isOwner: board.owner.id === userId };
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  // An empty list is a normal state, not an error.
  res.json(result);
};

/** POST /board/new { title, userEmails? } */
export const newBoardHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const title = parseTitle(req.body?.title);
  const emails = parseEmails(req.body?.userEmails);

  const invitees = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails, mode: "insensitive" }, id: { not: userId } },
        select: { id: true, email: true },
      })
    : [];

  const board = await prisma.board.create({
    data: {
      title,
      ownerId: userId,
      users: { connect: invitees.map(({ id }) => ({ id })) },
    },
    include: { owner: { select: publicUser }, users: { select: publicUser } },
  });

  const found = new Set(invitees.map((u) => u.email.toLowerCase()));
  res.status(201).json({
    ...board,
    isOwner: true,
    lastActivity: board.updatedAt,
    _count: { chats: 0, files: 0 },
    // Let the UI tell the creator which invitees still need to sign up.
    notFoundEmails: emails.filter((e) => !found.has(e)),
  });
};

/** GET /board/:id — board header info (title, owner, members). */
export const getBoardHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");

  const board = await prisma.board.findFirst({
    where: { id, ...memberOf(userId) },
    include: { owner: { select: publicUser }, users: { select: publicUser } },
  });
  if (!board) throw notFound("Board not found or you don't have access");

  res.json({ ...board, isOwner: board.ownerId === userId });
};

/** PATCH /board/:id { title } — owner renames the board. */
export const updateHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");
  const title = parseTitle(req.body?.title);
  await getOwnedBoard(id, userId, "rename the board");

  const updated = await prisma.board.update({ where: { id }, data: { title } });
  boardEvents()?.to(id).emit("boardUpdated", { id, title: updated.title });
  res.json(updated);
};

/** DELETE /board/:id — owner deletes board, its chat, drawing, sessions and uploaded files. */
export const deleteHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");
  await getOwnedBoard(id, userId, "delete the board");

  const files = await prisma.file.findMany({ where: { boardId: id }, select: { url: true } });
  await prisma.board.delete({ where: { id } }); // related rows cascade

  forgetDrawing(id);
  await Promise.all(
    files.map((f) => fs.unlink(path.join(config.uploadDir, path.basename(f.url))).catch(() => undefined)),
  );

  boardEvents()?.to(id).emit("boardDeleted", { id });
  res.json({ message: "Board deleted" });
};

/** GET /board/:id/members */
export const getMembersHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");
  await getMemberBoard(id, userId);

  const board = await prisma.board.findUnique({
    where: { id },
    select: { owner: { select: publicUser }, users: { select: publicUser } },
  });
  res.json(board);
};

/** POST /board/:id/members { email } — owner invites an existing user. */
export const inviteHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");
  const [email] = parseEmails([req.body?.email]);
  if (!email) throw badRequest("Please enter a valid email address");

  await getOwnedBoard(id, userId, "invite people");

  const invitee = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: publicUser,
  });
  if (!invitee) throw notFound("No TeamFlow account uses that email yet");
  if (invitee.id === userId) throw badRequest("You already own this board");

  await prisma.board.update({ where: { id }, data: { users: { connect: { id: invitee.id } } } });
  boardEvents()?.to(id).emit("membersChanged");
  res.status(201).json(invitee);
};

/**
 * DELETE /board/:id/members/:userId — owner removes someone, or a collaborator
 * removes themselves (leaves the board).
 */
export const removeMemberHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const id = param(req, "id");
  const targetId = param(req, "userId");

  const board = await getMemberBoard(id, userId);
  if (targetId === board.ownerId) throw badRequest("The owner can't be removed from their board");
  if (userId !== board.ownerId && userId !== targetId) {
    throw new HttpError(403, "Only the board owner can remove other people");
  }

  await prisma.board.update({ where: { id }, data: { users: { disconnect: { id: targetId } } } });
  boardEvents()?.to(id).emit("membersChanged", { removed: targetId });
  res.json({ message: userId === targetId ? "You left the board" : "Member removed" });
};
