type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_WRITES = 20;

/** Small anonymous-write guard for the public controlled lab. */
export function allowAnonymousWrite(scope: string, now = Date.now()) {
  const current = buckets.get(scope);
  if (!current || current.resetAt <= now) {
    buckets.set(scope, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }
  if (current.count >= MAX_WRITES) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }
  current.count += 1;
  return { allowed: true as const, retryAfterSeconds: 0 };
}

export function resetAnonymousWriteLimits() {
  buckets.clear();
}
