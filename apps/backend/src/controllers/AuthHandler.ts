import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { config } from "../config";
import { badRequest, HttpError, requireUserId } from "../lib/http";
import { publicUser } from "../lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (user: { id: string; email: string }) =>
  jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

export const signupHandler = async (req: Request, res: Response) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!EMAIL_RE.test(email)) throw badRequest("Please enter a valid email address");
  if (password.length < 8) throw badRequest("Password must be at least 8 characters");
  if (name.length > 60) throw badRequest("Name must be 60 characters or fewer");

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new HttpError(409, "An account with this email already exists");

  const user = await prisma.user.create({
    data: { name: name || null, email, password: await bcrypt.hash(password, 10) },
    select: publicUser,
  });

  // Return a token too, so the client is signed in straight after registering.
  res.status(201).json({ message: "Account created", user, token: signToken(user) });
};

export const signinHandler = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) throw badRequest("Email and password are required");

  // Case-insensitive so accounts created before email normalisation still work.
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  // Same message for both cases so the endpoint can't be used to discover accounts.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, "Invalid email or password");
  }

  res.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, email: user.email },
    token: signToken(user),
  });
};

export const meHandler = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: requireUserId(req) },
    select: { ...publicUser, createdAt: true },
  });
  if (!user) throw new HttpError(401, "Account no longer exists");
  res.json(user);
};
