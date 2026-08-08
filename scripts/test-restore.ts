import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  connectionArgs,
  databaseConfig,
  postgresBinary,
  runPostgresTool,
} from "./db-tools";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required");
const directory = resolve(process.env.BACKUP_DIR || "backups");
const newest = existsSync(directory)
  ? readdirSync(directory)
      .filter((name) => name.endsWith(".dump"))
      .map((name) => resolve(directory, name))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  : undefined;
const source = process.argv[2] ? resolve(process.argv[2]) : newest;
if (!source || !existsSync(source)) throw new Error("Test ediləcək backup tapılmadı");

const config = databaseConfig(baseUrl);
const name = `bantik_restore_test_${Date.now()}`;
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${name}`;

try {
  runPostgresTool("createdb", [
    "--host",
    config.host,
    "--port",
    config.port,
    "--username",
    config.user,
    name,
  ]);
  process.env.DATABASE_URL = testUrl.toString();
  runPostgresTool("pg_restore", [
    ...connectionArgs(),
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    source,
  ]);
  const count = execFileSync(
    postgresBinary("psql"),
    [...connectionArgs(), "--tuples-only", "--no-align", "--command", 'SELECT COUNT(*) FROM "Product"'],
    {
      encoding: "utf8",
      env: { ...process.env, PGPASSWORD: config.password },
    },
  ).trim();
  if (!Number(count)) throw new Error("Restore testində Product məlumatı tapılmadı");
  console.info(`Restore testi uğurludur: ${count} məhsul bərpa edildi`);
} finally {
  process.env.DATABASE_URL = baseUrl;
  try {
    runPostgresTool("dropdb", [
      "--host",
      config.host,
      "--port",
      config.port,
      "--username",
      config.user,
      "--force",
      name,
    ]);
  } catch {
    console.error(`Restore test database avtomatik silinmədi: ${name}`);
  }
}
