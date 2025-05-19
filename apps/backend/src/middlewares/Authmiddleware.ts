import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;  // add this
      user?: string | JwtPayload;
    }
  }
}

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.sendStatus(401);
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decodedUser) => {
    if (err) return res.sendStatus(403);

    req.user = decodedUser as string | JwtPayload;

    // extract userId from decodedUser (assuming your payload has userId)
    if (typeof decodedUser === "object" && decodedUser !== null && "userId" in decodedUser) {
      req.userId = (decodedUser as JwtPayload & { userId?: string }).userId;
    }

    next();
  });
}

export default authenticateToken;
