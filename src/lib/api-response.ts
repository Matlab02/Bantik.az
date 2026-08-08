import { NextResponse } from "next/server";
import { logger } from "./logger";

export function apiError(error: unknown, event: string, fallback: string) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  const status =
    message === "UNAUTHORIZED" ? 401 :
    message === "FORBIDDEN" || message === "INVALID_ORIGIN" ? 403 :
    message === "RATE_LIMITED" ? 429 : 400;
  if (status >= 500 || !["UNAUTHORIZED", "FORBIDDEN", "INVALID_ORIGIN", "RATE_LIMITED"].includes(message)) {
    logger.error(event, { error });
  }
  return NextResponse.json(
    { error: status === 401 ? "Sessiya etibarsızdır. Yenidən daxil olun." : status === 403 ? "Bu əməliyyat üçün icazəniz yoxdur." : fallback },
    { status },
  );
}
