import dotenv from "dotenv";
import path from "path";

dotenv.config();

const missing = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !process.env[name]);
if (missing.length) {
  // A friendly message instead of a stack trace: this is almost always first-run setup.
  console.error(
    `\n✖ Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}\n\n` +
      `  Create apps/backend/.env from the template and fill it in:\n` +
      `    cp .env.example .env\n\n` +
      `  On a host (Render, Railway, …) set them in the service's environment settings instead.\n`,
  );
  process.exit(1);
}

function required(name: string): string {
  return process.env[name] as string;
}

/** Comma-separated list of allowed origins, or "*" (default) to allow any. */
const rawOrigins = process.env.CORS_ORIGIN?.trim() || "*";

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: "7d" as const,
  isProd: process.env.NODE_ENV === "production",
  corsOrigin: rawOrigins === "*" ? "*" : rawOrigins.split(",").map((o) => o.trim()),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")),
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024,
};
