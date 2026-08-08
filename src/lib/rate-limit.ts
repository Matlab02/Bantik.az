export type RateLimitRule = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfter: number };

export interface RateLimitStore {
  consume(key: string, rule: RateLimitRule): RateLimitResult | Promise<RateLimitResult>;
}

type Entry = { count: number; resetAt: number };

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, Entry>();

  consume(key: string, rule: RateLimitRule): RateLimitResult {
    const now = Date.now();
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + rule.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt };
    this.entries.set(key, entry);
    if (this.entries.size > 10_000) {
      for (const [storedKey, stored] of this.entries) {
        if (stored.resetAt <= now) this.entries.delete(storedKey);
      }
    }
    return {
      allowed: entry.count <= rule.limit,
      remaining: Math.max(0, rule.limit - entry.count),
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
}

const globalRateLimit = globalThis as typeof globalThis & {
  __bantikRateLimit?: RateLimitStore;
};

export const rateLimitStore =
  globalRateLimit.__bantikRateLimit || new MemoryRateLimitStore();

if (process.env.NODE_ENV !== "production") {
  globalRateLimit.__bantikRateLimit = rateLimitStore;
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function rateLimit(
  scope: string,
  key: string,
  rule: RateLimitRule,
) {
  return rateLimitStore.consume(`${scope}:${key}`, rule);
}
