import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const starter = resolve("scripts/start-bantik-postgres.ps1");
const result = spawnSync(
  "powershell",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", starter],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
const child = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code || 0));
