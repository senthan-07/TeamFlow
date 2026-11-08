import prisma from "./prisma";
import { forbidden } from "./http";

/** Prisma filter: boards the user owns or collaborates on. */
export const memberOf = (userId: string) => ({
  OR: [{ ownerId: userId }, { users: { some: { id: userId } } }],
});

export async function isMember(boardId: string, userId: string): Promise<boolean> {
  if (typeof boardId !== "string" || !boardId) return false;
  const count = await prisma.board.count({ where: { id: boardId, ...memberOf(userId) } });
  return count > 0;
}

/** Board the user can access, or throws 403 (we don't reveal whether the board exists). */
export async function getMemberBoard(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({ where: { id: boardId, ...memberOf(userId) } });
  if (!board) throw forbidden();
  return board;
}

/** Board the user owns, or throws 403. */
export async function getOwnedBoard(boardId: string, userId: string, action = "do that") {
  const board = await prisma.board.findFirst({ where: { id: boardId } });
  if (!board || board.ownerId !== userId) {
    throw forbidden(`Only the board owner can ${action}`);
  }
  return board;
}

/** Fields that are safe to send to other users. Never select `password`. */
export const publicUser = { id: true, name: true, email: true } as const;
