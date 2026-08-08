import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { connectionArgs, databaseConfig, runPostgresTool } from "./db-tools";

const source = process.argv[2] ? resolve(process.argv[2]) : "";
if (!source || !existsSync(source)) {
  throw new Error("İstifadə: npm run db:restore -- backups/<file>.dump");
}
if (process.env.ALLOW_DATABASE_RESTORE !== "YES") {
  throw new Error("Restore üçün ALLOW_DATABASE_RESTORE=YES tələb olunur");
}
const config = databaseConfig();
if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PRODUCTION_RESTORE !== "YES"
) {
  throw new Error("Production restore üçün ALLOW_PRODUCTION_RESTORE=YES tələb olunur");
}
if (["postgres", "template0", "template1"].includes(config.database)) {
  throw new Error("Sistem bazasına restore qadağandır");
}

runPostgresTool("pg_restore", [
  ...connectionArgs(),
  "--clean",
  "--if-exists",
  "--no-owner",
  "--no-privileges",
  "--exit-on-error",
  source,
]);
console.info(`Restore tamamlandı: ${config.database}`);
