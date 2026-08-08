import "dotenv/config";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { connectionArgs, runPostgresTool } from "./db-tools";

const pad = (value: number) => String(value).padStart(2, "0");
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const directory = resolve(process.env.BACKUP_DIR || "backups");
mkdirSync(directory, { recursive: true });
const destination = resolve(directory, `bantik-${stamp}.dump`);

runPostgresTool("pg_dump", [
  ...connectionArgs(),
  "--format=custom",
  "--compress=9",
  "--no-owner",
  "--no-privileges",
  "--file",
  destination,
]);
console.info(`Backup yaradıldı: ${destination}`);
