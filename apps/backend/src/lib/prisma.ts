import { PrismaClient } from "@prisma/client";

/**
 * One shared client for the whole process. Each `new PrismaClient()` opens its own
 * connection pool, so creating one per file quickly exhausts hosted Postgres limits.
 */
const prisma = new PrismaClient();

export default prisma;
