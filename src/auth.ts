import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isHttpsDeployment } from "@/lib/public-env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The deployment URL is validated at startup and the app runs behind a trusted proxy.
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw, request) => {
        const result = loginSchema.safeParse(raw);
        if (!result.success) return null;

        const ipAddress = clientIp(request);
        const throttle = await rateLimit(
          "admin-login",
          `${ipAddress}:${result.data.email.toLowerCase()}`,
          { limit: 5, windowMs: 15 * 60_000 },
        );
        if (!throttle.allowed) {
          logger.warn("auth.login_throttled", { ip: ipAddress, email: result.data.email });
          return null;
        }
        const requestHost = new URL(request.url).hostname;
        const isLocalRequest = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
          requestHost,
        );
        if (
          env.NODE_ENV === "production" &&
          result.data.password === "change-me" &&
          !isLocalRequest
        ) {
          logger.warn("auth.default_password_blocked", { email: result.data.email });
          return null;
        }

        const ip =
          ipAddress || undefined;
        const userAgent = request.headers.get("user-agent") || undefined;

        if (db) {
          const user = await db.user.findUnique({
            where: { email: result.data.email },
          });
          const success = Boolean(
            user?.isActive &&
              user.passwordHash &&
              (await bcrypt.compare(result.data.password, user.passwordHash)),
          );

          await db.loginHistory.create({
            data: {
              userId: user?.id,
              email: result.data.email,
              ip,
              userAgent,
              success,
            },
          });

          if (success && user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              branchId: user.branchId,
            };
          }
        }

        if (
          env.NODE_ENV !== "production" &&
          result.data.email === process.env.AUTH_DEMO_ADMIN_EMAIL &&
          result.data.password === process.env.AUTH_DEMO_ADMIN_PASSWORD
        ) {
          return {
            id: "demo-admin",
            email: result.data.email,
            name: "BANTİK Admin",
            role: "SUPER_ADMIN",
          };
        }

        return null;
      },
    }),
  ],
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  cookies: {
    sessionToken: {
      name: isHttpsDeployment
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isHttpsDeployment,
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const typed = user as typeof user & {
          role?: string;
          branchId?: string | null;
        };
        token.role = typed.role || "SUPER_ADMIN";
        token.branchId = typed.branchId;
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const user = session.user as typeof session.user & {
        id?: string;
        role?: string;
        branchId?: string;
      };
      user.id = String(token.userId || token.sub || "");
      user.role = String(token.role || "SUPER_ADMIN");
      if (token.branchId) user.branchId = String(token.branchId);
      return session;
    },
    authorized: async ({ auth: session, request }) =>
      !request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname === "/admin/login" ||
      Boolean(session?.user),
  },
});
