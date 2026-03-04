// src/server/queues.ts
import { Queue } from "bullmq";
import { redis } from "@/src/server/redis";

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 3000 },
  removeOnComplete: 200,
  removeOnFail: 200,
};

export const weatherSyncQueue = new Queue("weatherSync", {
  connection: redis,
  defaultJobOptions,
});

export const digestQueue = new Queue("digest", {
  connection: redis,
  defaultJobOptions,
});

export const planRemindersQueue = new Queue("planReminders", {
  connection: redis,
  defaultJobOptions,
});

export const weeklyRecommendationsQueue = new Queue("weeklyRecommendations", {
  connection: redis,
  defaultJobOptions,
});