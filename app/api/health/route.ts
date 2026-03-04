import { prisma } from "@/src/server/prisma";
import IORedis from "ioredis";

export async function GET() {
  const checks: any = { ok: true, db: false, redis: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {
    checks.ok = false;
  }

  try {
    const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
    const pong = await redis.ping();
    await redis.quit();
    checks.redis = pong === "PONG";
    if (!checks.redis) checks.ok = false;
  } catch {
    checks.ok = false;
  }

  return Response.json(checks, { status: checks.ok ? 200 : 503 });
}