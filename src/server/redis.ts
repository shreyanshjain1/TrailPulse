import Redis from "ioredis";
import { env } from "@/src/env";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const redis =
  global.__redis ??
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

if (process.env.NODE_ENV !== "production") global.__redis = redis;
