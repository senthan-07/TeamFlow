import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

import { config } from "./config";
import prisma from "./lib/prisma";
import { setIO } from "./lib/socket";
import { errorHandler, notFoundHandler } from "./lib/http";

import { authRouter } from "./routes/Auth";
import { userRouter } from "./routes/User";
import { boardRouter } from "./routes/Board";
import { drawRouter } from "./routes/Draw";
import { chatRouter } from "./routes/Chat";
import { fileRouter } from "./routes/File";
import RTCrouter from "./routes/RTC";

import { initChatSocket } from "./sockets/chat";
import { flushAllDrawings, initDrawSocket } from "./sockets/draw";
import { endOpenSessions, initRTC } from "./sockets/rtc";
import { initBoardSocket } from "./sockets/board";

const app = express();
app.disable("x-powered-by");
// Behind Render/Railway/Nginx etc. so req.ip is the real client (used by the rate limiter).
app.set("trust proxy", 1);

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded", db: "unreachable" });
  }
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/board", boardRouter);
app.use("/draw", drawRouter);
app.use("/chat", chatRouter);
app.use("/files", fileRouter);
app.use("/rtc", RTCrouter);

// Types that are safe to render inline. Everything else (HTML, SVG, JS...) is forced to
// download so an uploaded file can't execute script on this origin.
const INLINE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".pdf", ".mp4", ".webm", ".mp3", ".wav", ".ogg", ".txt"]);
app.use(
  "/uploads",
  express.static(config.uploadDir, {
    maxAge: "7d",
    immutable: true, // filenames are random and never reused
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
      if (!INLINE_EXT.has(path.extname(filePath).toLowerCase())) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  }),
);

app.use(notFoundHandler);
app.use(errorHandler);

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin, methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6,
});
setIO(io);

initChatSocket(io);
initDrawSocket(io);
initRTC(io);
initBoardSocket(io);

async function start() {
  // Fail fast with a readable message instead of "running" with a broken database.
  try {
    await prisma.$connect();
  } catch (err) {
    const reason = String((err as Error).message).split("\n").map((l) => l.trim()).filter(Boolean).pop();
    console.error(
      `\n✖ Can't connect to the database.\n\n` +
        `  ${reason}\n\n` +
        `  Check DATABASE_URL in apps/backend/.env (postgresql://USER:PASSWORD@HOST:5432/DBNAME)\n` +
        `  and that Postgres is running. Then run: npx prisma migrate deploy\n`,
    );
    process.exit(1);
  }

  // Sessions left open by a crash or redeploy would otherwise show as "live" forever.
  await endOpenSessions().catch((err) => console.error("Failed to close stale call sessions:", err));

  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

void start();

async function shutdown(signal: string) {
  console.log(`${signal} received, saving state and shutting down…`);
  io.close();
  await flushAllDrawings().catch((err) => console.error("Flush failed:", err));
  await endOpenSessions().catch(() => undefined);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
