import { Worker, QueueEvents, JobsOptions } from "bullmq";
import { weatherSyncQueue, digestQueue } from "@/src/server/queues";
import { prisma } from "@/src/server/prisma";
import { env } from "@/src/env";
import { audit } from "@/src/server/audit";
import { redis } from "@/src/server/redis";

type WeatherPayload = {
  provider: string;
  summary: string;
  temperature_c: number;
  wind_kph: number;
  precipitation_chance: number;
  fetched_at_iso: string;
};

async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherPayload> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,wind_speed_10m,precipitation");
  url.searchParams.set("timezone", "Asia/Manila");

  const res = await fetch(url.toString(), { headers: { "User-Agent": "TrailPulse/1.0" } });
  if (!res.ok) throw new Error(`OpenMeteo HTTP ${res.status}`);
  const json: any = await res.json();
  const t = Number(json?.current?.temperature_2m ?? 0);
  const w = Number(json?.current?.wind_speed_10m ?? 0);
  const p = Number(json?.current?.precipitation ?? 0);
  const precipChance = Math.max(0, Math.min(100, Math.round(p * 20)));
  const summary = precipChance > 60 ? "High chance of rain" : precipChance > 30 ? "Possible showers" : "Mostly clear";

  return {
    provider: "open-meteo",
    summary,
    temperature_c: t,
    wind_kph: w,
    precipitation_chance: precipChance,
    fetched_at_iso: new Date().toISOString()
  };
}

function mockWeather(lat: number, lng: number): WeatherPayload {
  const seed = Math.abs(Math.sin(lat + lng + Date.now() / 1000 / 3600));
  const temperature = 18 + Math.round(seed * 14);
  const wind = 4 + Math.round(seed * 20);
  const precipChance = Math.round(seed * 80);
  const summary = precipChance > 60 ? "Rain likely" : precipChance > 35 ? "Scattered showers" : "Fair weather";
  return {
    provider: "mock",
    summary,
    temperature_c: temperature,
    wind_kph: wind,
    precipitation_chance: precipChance,
    fetched_at_iso: new Date().toISOString()
  };
}

async function runWeatherSync(jobId: string) {
  const startedAt = new Date();
  const jr = await prisma.jobRun.create({
    data: {
      queue: "weatherSync",
      jobId,
      name: "WeatherSync",
      status: "active",
      attempts: 0,
      startedAt
    }
  });

  try {
    const trailIds = await prisma.savedTrail.findMany({ select: { trailId: true } });
    const plannedTrailIds = await prisma.hikePlan.findMany({
      where: { startAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
      select: { trailId: true }
    });

    const uniq = Array.from(new Set([...trailIds, ...plannedTrailIds].map((x) => x.trailId)));
    if (uniq.length === 0) {
      await prisma.jobRun.update({ where: { id: jr.id }, data: { status: "completed", finishedAt: new Date() } });
      return;
    }

    const trails = await prisma.trail.findMany({ where: { id: { in: uniq } } });

    for (const t of trails) {
      let payload: WeatherPayload;
      try {
        payload = await fetchOpenMeteo(t.lat, t.lng);
      } catch {
        payload = mockWeather(t.lat, t.lng);
      }

      await prisma.weatherSnapshot.create({
        data: {
          trailId: t.id,
          payload: payload as any,
          fetchedAt: new Date()
        }
      });
    }

    await prisma.jobRun.update({ where: { id: jr.id }, data: { status: "completed", finishedAt: new Date() } });
    await audit({ userId: null, action: "JOB_RUN", target: "weatherSync", meta: { trails: trails.length } });
  } catch (e: any) {
    await prisma.jobRun.update({
      where: { id: jr.id },
      data: { status: "failed", error: String(e?.stack ?? e?.message ?? e), finishedAt: new Date() }
    });
    await audit({ userId: null, action: "JOB_RUN", target: "weatherSync_failed", meta: { error: String(e?.message ?? e) } });
    throw e;
  }
}

function diffScore(difficulty: string) {
  return difficulty === "EASY" ? 1 : difficulty === "MODERATE" ? 2 : 3;
}

async function runDigest(jobId: string) {
  const startedAt = new Date();
  const jr = await prisma.jobRun.create({
    data: {
      queue: "digest",
      jobId,
      name: "DailyDigest",
      status: "active",
      attempts: 0,
      startedAt
    }
  });

  try {
    const users = await prisma.user.findMany({ select: { id: true } });
    const allTrails = await prisma.trail.findMany();

    for (const u of users) {
      const saved = await prisma.savedTrail.findMany({ where: { userId: u.id }, include: { trail: true } });
      const planned = await prisma.hikePlan.findMany({ where: { userId: u.id }, include: { trail: true } });

      const trails = [...saved.map((s) => s.trail), ...planned.map((p) => p.trail)];
      if (trails.length === 0) continue;

      const avgDistance = trails.reduce((a, t) => a + t.distanceKm, 0) / trails.length;
      const avgDiff = trails.reduce((a, t) => a + diffScore(t.difficulty), 0) / trails.length;

      const savedSet = new Set(saved.map((s) => s.trailId));
      const candidates = allTrails
        .filter((t) => !savedSet.has(t.id))
        .map((t) => {
          const dScore = Math.abs(t.distanceKm - avgDistance) / Math.max(1, avgDistance);
          const diffDelta = Math.abs(diffScore(t.difficulty) - avgDiff) / 3;
          const score = dScore * 0.6 + diffDelta * 0.4;
          return { t, score };
        })
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map((x) => x.t);

      if (candidates.length === 0) continue;

      const bodyLines = candidates.map((t) => `• ${t.name} — ${t.region} — ${t.difficulty} — ${t.distanceKm} km`);
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "Weekly trail picks",
          body: ["Based on your saved and planned hikes, here are trails you might like:", "", ...bodyLines, "", "Open TrailPulse → Trails to explore more."].join("\n")
        }
      });
    }

    await prisma.jobRun.update({ where: { id: jr.id }, data: { status: "completed", finishedAt: new Date() } });
    await audit({ userId: null, action: "JOB_RUN", target: "digest" });
  } catch (e: any) {
    await prisma.jobRun.update({
      where: { id: jr.id },
      data: { status: "failed", error: String(e?.stack ?? e?.message ?? e), finishedAt: new Date() }
    });
    await audit({ userId: null, action: "JOB_RUN", target: "digest_failed", meta: { error: String(e?.message ?? e) } });
    throw e;
  }
}

async function ensureRepeatables() {
  const hours = env.WEATHER_SYNC_EVERY_HOURS;
  const everyMs = hours * 3600_000;

  await weatherSyncQueue.add(
    "weatherSync",
    {},
    {
      jobId: "weatherSync:repeat",
      repeat: { every: everyMs, tz: "Asia/Manila" }
    }
  );

  const hour = env.DIGEST_HOUR_LOCAL;
  const cron = `0 ${hour} * * *`; // at HH:00 Asia/Manila
  await digestQueue.add(
    "digest",
    {},
    {
      jobId: "digest:daily",
      repeat: { pattern: cron, tz: "Asia/Manila" }
    }
  );
}

async function main() {
  console.log("TrailPulse worker starting…");
  await ensureRepeatables();

  const weatherWorker = new Worker(
    "weatherSync",
    async (job) => {
      await runWeatherSync(String(job.id));
      return { ok: true };
    },
    { connection: redis }
  );

  const digestWorker = new Worker(
    "digest",
    async (job) => {
      await runDigest(String(job.id));
      return { ok: true };
    },
    { connection: redis }
  );

  // Queue events for observability
  const wEvents = new QueueEvents("weatherSync", { connection: redis });
  const dEvents = new QueueEvents("digest", { connection: redis });

  wEvents.on("failed", ({ jobId, failedReason }) => {
    console.error("weatherSync failed", jobId, failedReason);
  });
  dEvents.on("failed", ({ jobId, failedReason }) => {
    console.error("digest failed", jobId, failedReason);
  });

  process.on("SIGINT", async () => {
    console.log("Shutting down…");
    await weatherWorker.close();
    await digestWorker.close();
    await wEvents.close();
    await dEvents.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
