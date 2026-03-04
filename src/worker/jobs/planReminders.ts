import type { PrismaClient } from "@prisma/client";
import { ensureNotificationOnce } from "./helpers";

type ReminderOffset = { label: "24H" | "3H" | "30M"; minutesBefore: number };

const OFFSETS: ReminderOffset[] = [
  { label: "24H", minutesBefore: 24 * 60 },
  { label: "3H", minutesBefore: 3 * 60 },
  { label: "30M", minutesBefore: 30 },
];

export async function runPlanReminders(prisma: PrismaClient) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Plans starting in the next 24 hours
  const plans = await prisma.hikePlan.findMany({
    where: {
      startAt: { gte: now, lte: horizon },
    },
    include: {
      trail: { select: { name: true, region: true, difficulty: true, distanceKm: true, elevationGainM: true } },
    },
    take: 2000,
  });

  let createdCount = 0;

  for (const p of plans) {
    const start = new Date(p.startAt);

    for (const off of OFFSETS) {
      const fireAt = new Date(start.getTime() - off.minutesBefore * 60 * 1000);

      // Only send if within +/- 10 minutes window
      const diffMin = Math.abs((fireAt.getTime() - now.getTime()) / 60000);
      if (diffMin > 10) continue;

      const dedupeKey = `REMINDER:${off.label}:PLAN:${p.id}`; // stored in Notification.title

      const prettyStart = start.toLocaleString();
      const body = [
        `Trail: ${p.trail.name}`,
        `When: ${prettyStart}`,
        `Duration: ${p.durationMin} min`,
        `Difficulty: ${p.trail.difficulty}`,
        `Distance: ${p.trail.distanceKm} km • Elevation: ${p.trail.elevationGainM} m`,
        ``,
        `Open your plan in TrailPulse to check readiness + packing mode.`,
        `Link: /plans/${p.id}`,
      ].join("\n");

      const title = `Upcoming hike in ${off.label === "24H" ? "24 hours" : off.label === "3H" ? "3 hours" : "30 minutes"}`;

      const r = await ensureNotificationOnce(prisma, {
        userId: p.userId,
        dedupeKey,
        title,
        body,
      });

      if (r.created) createdCount++;
    }
  }

  return { scannedPlans: plans.length, createdCount };
}