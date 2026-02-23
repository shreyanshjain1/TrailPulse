// src/server/redis.ts
import IORedis from "ioredis";
import { env } from "@/src/env";

declare global {
  // eslint-disable-next-line no-var
  var __trailpulseRedis: IORedis | undefined;
}

/**
 * BullMQ workers require `maxRetriesPerRequest: null` so Redis blocking commands work properly.
 * Also keep a single Redis instance in dev to avoid too many connections during HMR.
 */
export function getRedis(): IORedis {
  const url = env.REDIS_URL;

  if (process.env.NODE_ENV !== "production") {
    if (!global.__trailpulseRedis) {
      global.__trailpulseRedis = new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    }
    return global.__trailpulseRedis;
  }

  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const redis = getRedis();