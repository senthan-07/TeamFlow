import { Request, Response } from "express";
import { param, requireUserId } from "../lib/http";
import { getMemberBoard, getOwnedBoard } from "../lib/access";
import { clearDrawing, loadStrokes } from "../sockets/draw";

/** GET /draw/:boardId — current strokes (e.g. for exporting or a read-only preview). */
export const getDrawingHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getMemberBoard(boardId, userId);
  res.json({ strokes: await loadStrokes(boardId) });
};

/** DELETE /draw/:boardId — owner wipes the canvas for everyone. */
export const deleteHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const boardId = param(req, "boardId");
  await getOwnedBoard(boardId, userId, "clear the canvas");
  await clearDrawing(boardId);
  res.json({ message: "Canvas cleared" });
};
