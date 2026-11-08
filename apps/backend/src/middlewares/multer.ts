import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { config } from "../config";

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    // Random name on disk; the original name is kept in the DB for display.
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});
