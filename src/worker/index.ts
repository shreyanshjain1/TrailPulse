// src/worker/index.ts
import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "@/src/server/prisma";
import { redis } from "@/src/server/redis";
import { env } from "@/src/env";
import {
  weatherSyncQueue,
  digestQueue,
  planRemindersQueue,
  weeklyRecommendationsQueue,
} from "@/src/server/queues";

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

// ---- small utils ----
function minutesDiff(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

// ---- Notification dedupe without schema changes ----
// Store a unique dedupe key in Notification.title.
// Put human readable title + content in body.
async function createNotificationOnce(input: {
  userId: string;
  dedupeKey: string;
  prettyTitle: string;
  body: string;
}) {
  const existing = await prisma.notification.findFirst({
    where: { userId: input.userId, title: input.dedupeKey },
    select: { id: true },
  });

  if (existing) return false;

  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.dedupeKey,
      body: `${input.prettyTitle}\n\n${input.body}`.trim(),
      isRead: false,
    },
  });

  return true;
}

// ---- Existing jobs ----
async function runWeatherSync(jobId: string, attempts: number) {
  const jr = await jobRunStart("weatherSync", jobId, "WeatherSync", attempts);

  try {
    const trails = await prisma.trail.findMany({
      take: 50,
      select: { id: true, lat: true, lng: true },
      where: {
        OR: [{ savedBy: { some: {} } }, { plans: { some: {} } }],
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

async function runDigest(jobId: string, attempts: number) {
  const jr = await jobRunStart("digest", jobId, "Digest", attempts);

  try {
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
          isRead: false,
        },
      });
    }

    await jobRunFinish(jr.id, "completed");
  } catch (e: any) {
    await jobRunFinish(jr.id, "failed", String(e?.message ?? e));
    throw e;
  }
}

// ---- NEW: Plan reminders ----
async function runPlanReminders(jobId: string, attempts: number) {
  const jr = await jobRunStart("planReminders", jobId, "PlanReminders", attempts);

  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const plans = await prisma.hikePlan.findMany({
      where: { startAt: { gte: now, lte: horizon } },
      include: {
        trail: { select: { name: true, difficulty: true, distanceKm: true, elevationGainM: true } },
      },
      take: 2000,
    });

    const offsets = [
      { label: "24H", minutesBefore: 24 * 60, pretty: "24 hours" },
      { label: "3H", minutesBefore: 3 * 60, pretty: "3 hours" },
      { label: "30M", minutesBefore: 30, pretty: "30 minutes" },
    ];

    let createdCount = 0;

    for (const p of plans) {
      const start = new Date(p.startAt);

      for (const off of offsets) {
        const fireAt = new Date(start.getTime() - off.minutesBefore * 60 * 1000);
        if (minutesDiff(fireAt, now) > 10) continue; // only within 10 min window

        const dedupeKey = `REMINDER:${off.label}:PLAN:${p.id}`;
        const prettyTitle = `Upcoming hike in ${off.pretty}`;

        const body = [
          `Trail: ${p.trail.name}`,
          `Start: ${start.toLocaleString()}`,
          `Duration: ${p.durationMin} min`,
          `Difficulty: ${p.trail.difficulty}`,
          `Distance: ${p.trail.distanceKm} km • Elevation: ${p.trail.elevationGainM} m`,
          ``,
          `Open: /plans/${p.id}`,
        ].join("\n");

        const created = await createNotificationOnce({
          userId: p.userId,
          dedupeKey,
          prettyTitle,
          body,
        });

        if (created) createdCount++;
      }
    }

    await jobRunFinish(jr.id, "completed");
    return { scannedPlans: plans.length, createdCount };
  } catch (e: any) {
    await jobRunFinish(jr.id, "failed", String(e?.message ?? e));
    throw e;
  }
}

// ---- NEW: Weekly recommendations ----
async function runWeeklyRecommendations(jobId: string, attempts: number) {
  const jr = await jobRunStart("weeklyRecommendations", jobId, "WeeklyRecommendations", attempts);

  try {
    const users = await prisma.user.findMany({
      select: { id: true, homeLabel: true, homeLat: true, homeLng: true },
      take: 5000,
    });

    let createdCount = 0;

    for (const u of users) {
      const saved = await prisma.savedTrail.findMany({
        where: { userId: u.id },
        include: { trail: { select: { id: true, difficulty: true } } },
        take: 200,
      });

      // preferred difficulty = most saved
      const diffCounts = new Map<string, number>();
      for (const s of saved) {
        const d = String(s.trail.difficulty);
        diffCounts.set(d, (diffCounts.get(d) ?? 0) + 1);
      }
      let preferredDifficulty = "MODERATE";
      let best = -1;
      for (const [k, v] of diffCounts.entries()) {
        if (v > best) {
          best = v;
          preferredDifficulty = k;
        }
      }

      const home =
        typeof u.homeLat === "number" && typeof u.homeLng === "number"
          ? { lat: u.homeLat, lng: u.homeLng }
          : null;

      // candidate trails (same difficulty)
      let candidates = await prisma.trail.findMany({
        where: { difficulty: preferredDifficulty as any },
        select: {
          id: true,
          name: true,
          region: true,
          difficulty: true,
          distanceKm: true,
          elevationGainM: true,
          lat: true,
          lng: true,
        },
        take: 250,
      });

      if (candidates.length < 30) {
        candidates = await prisma.trail.findMany({
          select: {
            id: true,
            name: true,
            region: true,
            difficulty: true,
            distanceKm: true,
            elevationGainM: true,
            lat: true,
            lng: true,
          },
          take: 350,
        });
      }

      const savedIds = new Set(saved.map((s) => s.trail.id));
      candidates = candidates.filter((t) => !savedIds.has(t.id));

      if (home) {
        candidates.sort((a, b) => {
          const da = haversineKm(home, { lat: a.lat, lng: a.lng });
          const db = haversineKm(home, { lat: b.lat, lng: b.lng });
          return da - db;
        });
      }

      const picks = candidates.slice(0, 5);
      if (!picks.length) continue;

      const weekKey = new Date().toISOString().slice(0, 10);
      const dedupeKey = `DIGEST:WEEKLY:${weekKey}:USER:${u.id}`;
      const prettyTitle = "Top picks for your week";

      const fromText = u.homeLabel
        ? `From: ${u.homeLabel}`
        : home
        ? "From your start location"
        : "Set start location in Profile to get nearby picks";

      const body = [
        fromText,
        `Preference: ${preferredDifficulty}`,
        ``,
        ...picks.map(
          (t, i) =>
            `${i + 1}. ${t.name} (${t.region}) • ${t.difficulty} • ${t.distanceKm} km • ${t.elevationGainM} m • /trails/${t.id}`,
        ),
      ].join("\n");

      const created = await createNotificationOnce({
        userId: u.id,
        dedupeKey,
        prettyTitle,
        body,
      });

      if (created) createdCount++;
    }

    await jobRunFinish(jr.id, "completed");
    return { usersProcessed: users.length, createdCount };
  } catch (e: any) {
    await jobRunFinish(jr.id, "failed", String(e?.message ?? e));
    throw e;
  }
}

async function main() {
  console.log("TrailPulse worker starting…");

  // Workers
  const weatherWorker = new Worker(
    "weatherSync",
    async (job) => {
      await runWeatherSync(String(job.id), job.attemptsMade ?? 0);
    },
    { connection: redis },
  );

  const digestWorker = new Worker(
    "digest",
    async (job) => {
      await runDigest(String(job.id), job.attemptsMade ?? 0);
    },
    { connection: redis },
  );

  const remindersWorker = new Worker(
    "planReminders",
    async (job) => {
      await runPlanReminders(String(job.id), job.attemptsMade ?? 0);
    },
    { connection: redis },
  );

  const weeklyWorker = new Worker(
    "weeklyRecommendations",
    async (job) => {
      await runWeeklyRecommendations(String(job.id), job.attemptsMade ?? 0);
    },
    { connection: redis },
  );

  weatherWorker.on("failed", (job, err) => console.error("weatherSync failed", job?.id, err?.message));
  digestWorker.on("failed", (job, err) => console.error("digest failed", job?.id, err?.message));
  remindersWorker.on("failed", (job, err) => console.error("planReminders failed", job?.id, err?.message));
  weeklyWorker.on("failed", (job, err) => console.error("weeklyRecommendations failed", job?.id, err?.message));

  // Schedules
  const everyHours = Number(env.WEATHER_SYNC_EVERY_HOURS ?? 6);
  const digestHour = Number(env.DIGEST_HOUR_LOCAL ?? 8);

  await weatherSyncQueue.add(
    "weatherSync",
    { trigger: "repeat" },
    {
      repeat: { every: Math.max(1, everyHours) * 60 * 60 * 1000 },
      jobId: "weatherSync-repeat",
    },
  );

  await digestQueue.add(
    "digest",
    { trigger: "daily" },
    {
      repeat: { pattern: `0 ${Math.min(23, Math.max(0, digestHour))} * * *` },
      jobId: "digest-daily",
    },
  );

  // NEW: reminders every 15 minutes
  await planRemindersQueue.add(
    "planReminders",
    { trigger: "repeat" },
    {
      repeat: { every: 15 * 60 * 1000 },
      jobId: "planReminders-15m",
    },
  );

  // NEW: weekly recommendations every Monday 08:00 (server time)
  await weeklyRecommendationsQueue.add(
    "weeklyRecommendations",
    { trigger: "weekly" },
    {
      repeat: { pattern: "0 8 * * 1" },
      jobId: "weeklyRecommendations-mon-8",
    },
  );

  console.log("Worker ready: weatherSync + digest + planReminders + weeklyRecommendations scheduled.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});