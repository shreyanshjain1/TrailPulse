// src/server/queues.ts
import { Queue } from "bullmq";
import { redis } from "@/src/server/redis";

export const weatherSyncQueue = new Queue("weatherSync", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  },
});

export const digestQueue = new Queue("digest", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 200,
    removeOnFail: 200,
  },
});