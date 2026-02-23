import { redis } from "@/src/server/redis";
import { env } from "@/src/env";
import { audit } from "@/src/server/audit";

type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export async function rateLimit(opts: {
  key: string;
  max?: number;
  windowSec?: number;
  userId?: string | null;
  ip?: string | null;
  ua?: string | null;
}): Promise<RateLimitResult> {
  const max = opts.max ?? env.RATE_LIMIT_MAX;
  const windowSec = opts.windowSec ?? env.RATE_LIMIT_WINDOW_SEC;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSec;

  // Sliding window in a sorted set
  const zkey = `rl:${opts.key}`;
  const member = `${now}:${Math.random().toString(16).slice(2)}`;

  const multi = redis.multi();
  multi.zremrangebyscore(zkey, 0, windowStart);
  multi.zadd(zkey, now, member);
  multi.zcard(zkey);
  multi.expire(zkey, windowSec + 5);

  const res = await multi.exec();
  const count = Number(res?.[2]?.[1] ?? 0);

  if (count > max) {
    const ttl = await redis.ttl(zkey);
    const retryAfterSec = Math.max(1, ttl);
    await audit({
      userId: opts.userId ?? null,
      action: "RATE_LIMITED",
      target: opts.key,
      meta: { max, windowSec },
      ip: opts.ip ?? null,
      ua: opts.ua ?? null
    });
    return { ok: false, retryAfterSec };
  }

  return { ok: true };
}
