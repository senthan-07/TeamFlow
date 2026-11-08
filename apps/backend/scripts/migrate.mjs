/**
 * Runs before the server on every deploy (see "start" in package.json).
 *
 *  - Normal case: applies any pending migrations (`prisma migrate deploy`).
 *  - Database created with `prisma db push` (no migration history, Prisma error P3005):
 *    marks the pre-existing migrations as already applied ("baselining"), then deploys
 *    the rest.
 *  - Anything else fails: logs loudly and exits 0 so the API still starts. The app keeps
 *    working on the previous schema; fix the database and redeploy.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Migrations that existed before migration history was tracked by this script.
const BASELINE_UP_TO = "20250527071336_unique_drawing";

function prisma(...args) {
  const res = spawnSync("npx", ["--no-install", "prisma", ...args], { cwd: root, encoding: "utf8" });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  return { ok: res.status === 0, output };
}

function log(msg) {
  console.log(`[migrate] ${msg}`);
}

let result = prisma("migrate", "deploy");

if (!result.ok && result.output.includes("P3005")) {
  log("Database has tables but no migration history. Baselining existing migrations…");
  const existing = readdirSync(join(root, "prisma", "migrations"))
    .filter((d) => /^\d{14}_/.test(d) && d <= BASELINE_UP_TO)
    .sort();
  for (const name of existing) {
    const r = prisma("migrate", "resolve", "--applied", name);
    log(r.ok ? `marked ${name} as applied` : `could not mark ${name}: ${r.output.trim().split("\n").pop()}`);
  }
  result = prisma("migrate", "deploy");
}

if (result.ok) {
  const applied = result.output.match(/Applying migration `[^`]+`/g) ?? [];
  log(applied.length ? applied.join(", ") : "database is up to date");
} else {
  console.error("[migrate] ⚠ Migrations failed. Starting the server on the current schema.\n" + result.output);
}
