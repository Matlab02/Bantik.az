import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";

async function main() {
  const email = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("ADMIN_INITIAL_EMAIL və ən azı 12 simvolluq ADMIN_INITIAL_PASSWORD tələb olunur");
  }
  if (password === "change-me") throw new Error("Standart parol istifadə edilə bilməz");
  await db.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      email,
      name: "BANTİK Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.info(`Super admin hazırdır: ${email}`);
}

main().finally(() => db.$disconnect());
