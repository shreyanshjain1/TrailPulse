import { Queue } from "bullmq";
import { redis } from "@/src/server/redis";

export const weatherSyncQueue = new Queue("weatherSync", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 }
  }
});

export const digestQueue = new Queue("digest", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 }
  }
});
