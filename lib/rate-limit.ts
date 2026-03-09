// Simple in-memory rate limiter per IP
// Resets on deploy (serverless cold start) — good enough for abuse prevention

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  { maxRequests = 10, windowMs = 60 * 1000 } = {}
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return { ok: false, remaining: 0 };
  }

  return { ok: true, remaining: maxRequests - entry.count };
}
