import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const isGenerateCommand = process.argv.some((argument) => argument === "generate");
const databaseUrl =
  process.env.DATABASE_URL ||
  (isGenerateCommand
    ? "postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only"
    : env("DATABASE_URL"));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: databaseUrl },
});
