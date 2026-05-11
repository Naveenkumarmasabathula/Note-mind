const windows = new Map<string, { count: number; resetAt: number }>();

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  windows.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function requestKey(request: Request, userId: string, scope: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${scope}:${userId}:${ip}`;
}
