import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";

/** Throw from any route handler; Express 5 forwards async errors to `errorHandler`. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = "You don't have access to this board") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);

/** Returns the authenticated user id or throws 401. */
export function requireUserId(req: Request): string {
  if (!req.userId) throw new HttpError(401, "Unauthorized");
  return req.userId;
}

/** Route params are typed `string | string[]` in Express 5 typings; normalise to string. */
export function param(req: Request, name: string): string {
  const value = (req.params as Record<string, string | string[] | undefined>)[name];
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) throw badRequest(`Missing parameter: ${name}`);
  return str;
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
    res.status(400).json({ error: message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Malformed JSON body" });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
}
