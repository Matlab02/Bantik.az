import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

const globalDb = globalThis as typeof globalThis & {
  __bantikPrisma?: PrismaClient;
};

export const db =
  globalDb.__bantikPrisma ||
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

if (env.NODE_ENV !== "production") globalDb.__bantikPrisma = db;
