import type { PrismaClient, Difficulty } from "@prisma/client";
import { haversineKm, ensureNotificationOnce } from "./helpers";

function topDifficulty(saved: { trail: { difficulty: Difficulty } }[]) {
  const counts = new Map<string, number>();
  for (const s of saved) {
    const d = String(s.trail.difficulty);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best = "MODERATE";
  let bestC = -1;
  for (const [k, v] of counts.entries()) {
    if (v > bestC) {
      bestC = v;
      best = k;
    }
  }
  return best as Difficulty;
}

export async function runWeeklyRecommendations(prisma: PrismaClient) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      homeLabel: true,
      homeLat: true,
      homeLng: true,
    },
    take: 5000,
  });

  let createdCount = 0;

  for (const u of users) {
    // pull saved trails for preference inference
    const saved = await prisma.savedTrail.findMany({
      where: { userId: u.id },
      include: { trail: { select: { id: true, difficulty: true } } },
      take: 200,
    });

    const preferredDifficulty = saved.length ? topDifficulty(saved) : ("MODERATE" as Difficulty);

    const home =
      typeof u.homeLat === "number" && typeof u.homeLng === "number"
        ? { lat: u.homeLat, lng: u.homeLng }
        : null;

    // Candidate trails: same difficulty preferred, then fallback to any
    const candidates = await prisma.trail.findMany({
      where: { difficulty: preferredDifficulty },
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
      take: 200,
    });

    let list = candidates;

    if (list.length < 20) {
      const fallback = await prisma.trail.findMany({
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
        take: 300,
      });
      list = fallback;
    }

    // remove saved ones
    const savedIds = new Set(saved.map((s) => s.trail.id));
    list = list.filter((t) => !savedIds.has(t.id));

    // sort by proximity if home exists
    if (home) {
      list.sort((a, b) => {
        const da = haversineKm(home, { lat: a.lat, lng: a.lng });
        const db = haversineKm(home, { lat: b.lat, lng: b.lng });
        return da - db;
      });
    }

    const picks = list.slice(0, 5);
    if (picks.length === 0) continue;

    const dedupeKey = `DIGEST:WEEKLY:${new Date().toISOString().slice(0, 10)}:USER:${u.id}`;

    const header = `Top picks for your week`;
    const whereFrom = u.homeLabel ? `From: ${u.homeLabel}` : home ? `From your start location` : `Set a start location in Profile for better picks.`;

    const bodyLines = [
      whereFrom,
      `Preference: ${preferredDifficulty}`,
      ``,
      ...picks.map(
        (t, i) =>
          `${i + 1}. ${t.name} (${t.region}) • ${t.difficulty} • ${t.distanceKm} km • ${t.elevationGainM} m • /trails/${t.id}`,
      ),
      ``,
      `Tip: Save a trail, then tap Plan to build a smart checklist + readiness score.`,
    ];

    const r = await ensureNotificationOnce(prisma, {
      userId: u.id,
      dedupeKey,
      title: header,
      body: bodyLines.join("\n"),
    });

    if (r.created) createdCount++;
  }

  return { usersProcessed: users.length, createdCount };
}