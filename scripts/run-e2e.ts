import "dotenv/config";
import { spawnSync } from "node:child_process";
import { databaseConfig, runPostgresTool } from "./db-tools";

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required");
const name = `bantik_e2e_${Date.now()}`;
const config = databaseConfig(baseUrl);
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${name}`;
const childEnv = {
  ...process.env,
  DATABASE_URL: testUrl.toString(),
  NODE_ENV: "test" as const,
};

function run(command: string, args: string[]) {
  const result = spawnSync(process.env.ComSpec || "cmd.exe", [
    "/d",
    "/s",
    "/c",
    [command, ...args].join(" "),
  ], {
    stdio: "inherit",
    env: childEnv,
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message || result.status}`);
  }
}

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
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npx", ["prisma", "db", "seed"]);
  run("npx", ["tsx", "--test", "src/lib/database.e2e.ts"]);
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
    console.error(`Test database avtomatik silinmədi: ${name}`);
  }
}
