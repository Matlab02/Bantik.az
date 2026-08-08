type Level = "INFO" | "WARN" | "ERROR";

const sensitiveKeys = /password|secret|token|authorization|cookie|session/i;

function sanitize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKeys.test(key) ? "[REDACTED]" : sanitize(item),
      ]),
    );
  }
  return value;
}

function write(level: Level, event: string, context: Record<string, unknown> = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(context) as object,
  });
  if (level === "ERROR") console.error(entry);
  else if (level === "WARN") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => write("INFO", event, context),
  warn: (event: string, context?: Record<string, unknown>) => write("WARN", event, context),
  error: (event: string, context?: Record<string, unknown>) => write("ERROR", event, context),
};
