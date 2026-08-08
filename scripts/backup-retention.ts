import "dotenv/config";
import { readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const directory = resolve(process.env.BACKUP_DIR || "backups");
const keep = Math.max(1, Number(process.env.BACKUP_RETENTION_COUNT || 14));
let files: string[] = [];
try {
  files = readdirSync(directory)
    .filter((name) => /^bantik-.*\.dump$/.test(name))
    .map((name) => resolve(directory, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
} catch {
  console.info("Backup qovluğu hələ yaradılmayıb");
  process.exit(0);
}
for (const file of files.slice(keep)) unlinkSync(file);
console.info(`Retention tamamlandı: ${Math.min(files.length, keep)} backup saxlanıldı`);
