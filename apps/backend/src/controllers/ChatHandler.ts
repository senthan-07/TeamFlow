import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { param, requireUserId } from "../lib/http";
import { getMemberBoard, getOwnedBoard, publicUser } from "../lib/access";
import { boardEvents } from "../lib/socket";

/**
 * GET /chat/:boardId?before=<messageId>&limit=50
 * Cursor-paginated history, returned oldest → newest. The socket sends the latest page
 * on join; the client calls this with `before` to load older messages on scroll.
 */
export const getHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getMemberBoard(boardId, userId);

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const before = typeof req.query.before === "string" ? req.query.before : undefined;

  const page = await prisma.chat.findMany({
    where: { boardId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    include: { user: { select: publicUser } },
  });

  const hasMore = page.length > limit;
  res.json({ messages: page.slice(0, limit).reverse(), hasMore });
};

/** DELETE /chat/:boardId — owner clears the chat history. */
export const deleteHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getOwnedBoard(boardId, userId, "clear the chat");

  await prisma.chat.deleteMany({ where: { boardId } });
  boardEvents()?.server.of("/chat").to(boardId).emit("chatCleared");
  res.json({ message: "Chat cleared" });
};
