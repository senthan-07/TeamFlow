import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/prisma";
import { badRequest, HttpError, requireUserId } from "../lib/http";
import { publicUser } from "../lib/access";

export const getMeHandler = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: requireUserId(req) },
    select: { ...publicUser, createdAt: true, updatedAt: true },
  });
  if (!user) throw new HttpError(404, "User not found");
  res.json(user);
};

/** Update display name and/or password. Changing the password requires the current one. */
export const patchMeHandler = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const { name, password, currentPassword } = req.body ?? {};
  const data: { name?: string; password?: string } = {};

  if (typeof name === "string") {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw badRequest("Name must be 1–60 characters");
    data.name = trimmed;
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      throw badRequest("New password must be at least 8 characters");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new HttpError(401, "Current password is incorrect");
    }
    data.password = await bcrypt.hash(password, 10);
  }

  if (!Object.keys(data).length) throw badRequest("Nothing to update");

  const updated = await prisma.user.update({ where: { id: userId }, data, select: publicUser });
  res.json(updated);
};
