import { auth } from "@/auth";
import type { StaffRole } from "./inventory";

export type Staff = {
  id: string;
  email?: string | null;
  role: StaffRole;
  branchId?: string;
};

export async function requireStaff(
  allowed: StaffRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "WAREHOUSE_MANAGER",
    "BRANCH_MANAGER",
    "SALES_STAFF",
  ],
): Promise<Staff> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  const user = session.user as typeof session.user & {
    id?: string;
    role?: StaffRole;
    branchId?: string;
  };
  const staff = {
    id: user.id || user.email || "admin",
    email: user.email,
    role: user.role || "SUPER_ADMIN",
    branchId: user.branchId,
  };
  if (!allowed.includes(staff.role)) throw new Error("FORBIDDEN");
  return staff;
}

export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "Xəta";
  const status =
    message === "UNAUTHORIZED"
      ? 401
      : message === "FORBIDDEN" || message === "INVALID_ORIGIN"
        ? 403
        : message === "RATE_LIMITED"
          ? 429
          : 400;
  return { message, status };
}
