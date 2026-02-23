// src/worker/index.ts
import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/src/server/prisma";
import { redis } from "@/src/server/redis";
import { env } from "@/src/env";
import { weatherSyncQueue, digestQueue } from "@/src/server/queues";

// ---- Weather provider (simple Open-Meteo) ----
async function fetchWeather(lat: number, lng: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lng)}` +
    `&current=temperature_2m,wind_speed_10m` +
    `&hourly=precipitation_probability` +
    `&forecast_days=1`;

  const res = await fetch(url, { headers: { "User-Agent": "TrailPulseWorker/1.0" } });
  if (!res.ok) throw new Error(`Weather provider error: ${res.status}`);
  const data: any = await res.json();

  const temp = data?.current?.temperature_2m;
  const wind = data?.current?.wind_speed_10m;
  const precip = Array.isArray(data?.hourly?.precipitation_probability)
    ? data.hourly.precipitation_probability[0]
    : undefined;

  return {
    summary: "Forecast snapshot",
    temperature_c: typeof temp === "number" ? temp : undefined,
    wind_kph: typeof wind === "number" ? wind : undefined,
    precipitation_chance: typeof precip === "number" ? precip : undefined,
    raw: data,
  };
}

// ---- Helpers for JobRun logging ----
async function jobRunStart(queue: string, jobId: string, name: string, attempts: number) {
  return prisma.jobRun.create({
    data: {
      queue,
      jobId,
      name,
      status: "active",
      attempts,
    },
  });
}

async function jobRunFinish(id: string, status: "completed" | "failed", error?: string) {
  await prisma.jobRun.update({
    where: { id },
    data: {
      status,
      error: error ?? null,
    },
  });
}

async function runWeatherSync(jobId: string) {
  const jr = await jobRunStart("weatherSync", jobId, "WeatherSync", 0);

  try {
    // Trails that are saved or planned recently
    const trails = await prisma.trail.findMany({
      take: 50,
      select: { id: true, lat: true, lng: true },
      where: {
        OR: [
          { savedBy: { some: {} } },
          { plans: { some: {} } },
        ],
      },
    });

    for (const t of trails) {
      const snap = await fetchWeather(t.lat, t.lng);

      await prisma.weatherSnapshot.create({
        data: {
          trailId: t.id,
          payload: snap,
        },
      });
    }

    await jobRunFinish(jr.id, "completed");
  } catch (e: any) {
    await jobRunFinish(jr.id, "failed", String(e?.message ?? e));
    throw e;
  }
}

async function runDigest(jobId: string) {
  const jr = await jobRunStart("digest", jobId, "Digest", 0);

  try {
    // For each user, pick some trails and write notifications
    const users = await prisma.user.findMany({ select: { id: true } });

    for (const u of users) {
      const picks = await prisma.trail.findMany({
        take: 3,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, difficulty: true, distanceKm: true },
      });

      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "Weekly picks",
          body:
            "Here are a few fresh trails to consider this week:\n" +
            picks.map((p) => `• ${p.name} (${p.difficulty}, ${p.distanceKm} km)`).join("\n"),
        },
      });
    }

    await jobRunFinish(jr.id, "completed");
  } catch (e: any) {
    await jobRunFinish(jr.id, "failed", String(e?.message ?? e));
    throw e;
  }
}

async function main() {
  console.log("TrailPulse worker starting…");

  // BullMQ requires maxRetriesPerRequest: null (handled in src/server/redis.ts)
  // Create workers
  const weatherWorker = new Worker(
    "weatherSync",
    async (job) => {
      await runWeatherSync(String(job.id));
    },
    { connection: redis }
  );

  const digestWorker = new Worker(
    "digest",
    async (job) => {
      await runDigest(String(job.id));
    },
    { connection: redis }
  );

  weatherWorker.on("failed", (job, err) => {
    console.error("weatherSync failed", job?.id, err?.message);
  });

  digestWorker.on("failed", (job, err) => {
    console.error("digest failed", job?.id, err?.message);
  });

  // Add repeatable jobs (safe in dev; duplicates avoided by jobId)
  const everyHours = Number(env.WEATHER_SYNC_EVERY_HOURS ?? 6);
  const digestHour = Number(env.DIGEST_HOUR_LOCAL ?? 8);

  await weatherSyncQueue.add(
    "weatherSync",
    { trigger: "repeat" },
    {
      repeat: { every: Math.max(1, everyHours) * 60 * 60 * 1000 },
      jobId: "weatherSync-repeat",
    }
  );

  // Run digest daily at local hour (approx via cron)
  // Asia/Manila = UTC+8
  await digestQueue.add(
    "digest",
    { trigger: "daily" },
    {
      repeat: { pattern: `0 ${Math.min(23, Math.max(0, digestHour))} * * *` },
      jobId: "digest-daily",
    }
  );

  console.log("Worker ready: weatherSync + digest scheduled.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});