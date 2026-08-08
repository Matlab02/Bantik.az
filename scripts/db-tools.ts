import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function databaseConfig(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const url = new URL(connectionString);
  return {
    host: url.hostname || "127.0.0.1",
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
}

export function postgresBinary(name: string) {
  const candidates = [
    process.env.POSTGRES_BIN ? `${process.env.POSTGRES_BIN}\\${name}.exe` : "",
    `C:\\Program Files\\PostgreSQL\\17\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\16\\bin\\${name}.exe`,
  ].filter(Boolean);
  return candidates.find(existsSync) || name;
}

export function runPostgresTool(name: string, args: string[]) {
  const config = databaseConfig();
  execFileSync(postgresBinary(name), args, {
    stdio: "inherit",
    env: { ...process.env, PGPASSWORD: config.password },
  });
}

export function connectionArgs(database?: string) {
  const config = databaseConfig();
  return [
    "--host",
    config.host,
    "--port",
    config.port,
    "--username",
    config.user,
    "--dbname",
    database || config.database,
  ];
}
