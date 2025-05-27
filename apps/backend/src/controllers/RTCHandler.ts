import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Start a new RTC session
export const startSessionHandler = async (req: Request, res: Response) => {
  const { boardId } = req.body;

  try {
    const session = await prisma.rTCSessions.create({
      data: {
        boardId,
      },
    });

    res.status(201).json(session);
  } catch (err) {
    console.error("Failed to start RTC session:", err);
    res.status(500).json({ error: "Failed to start session" });
  }
};

// End an existing RTC session
export const endSessionHandler = async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = await prisma.rTCSessions.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });

    res.status(200).json(session);
  } catch (err) {
    console.error("Failed to end RTC session:", err);
    res.status(500).json({ error: "Failed to end session" });
  }
};

// List all RTC sessions for a board
export const listSessionsHandler = async (req: Request, res: Response) => {
  const { boardId } = req.params;

  try {
    const sessions = await prisma.rTCSessions.findMany({
      where: { boardId },
      orderBy: { startedAt: "desc" },
    });

    res.status(200).json(sessions);
  } catch (err) {
    console.error("Failed to fetch RTC sessions:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
};
