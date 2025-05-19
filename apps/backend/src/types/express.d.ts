import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type User = Awaited<ReturnType<typeof prisma.user.findUnique>>;

// Extend Express Request with `user` and `userId`
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
    }
  }
}

// Needed to treat this file as a module and keep global augmentation valid
export {};
