import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string };
    if (!decoded.userId) throw new Error("Malformed token");
    req.userId = decoded.userId;
    next();
  } catch {
    // 401 (not 403) so the client knows to drop the token and sign in again.
    res.status(401).json({ error: "Session expired, please sign in again" });
  }
}

export default authenticateToken;
