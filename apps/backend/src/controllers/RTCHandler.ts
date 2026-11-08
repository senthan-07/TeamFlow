import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { param, requireUserId } from "../lib/http";
import { getMemberBoard } from "../lib/access";

/**
 * GET /rtc/:boardId — call history for a board. Sessions are now opened and closed
 * by the RTC socket (first person joins → start, last person leaves → end), so there
 * are no manual start/end endpoints any more.
 */
export const listSessionsHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getMemberBoard(boardId, userId);

  const sessions = await prisma.rTCSessions.findMany({
    where: { boardId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  res.json(sessions);
};
