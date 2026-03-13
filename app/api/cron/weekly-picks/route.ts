import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Simple “real world” recommender:
  // - For each user, pick trails from regions they’ve saved most (fallback: global top)
  const users = await prisma.user.findMany({ select: { id: true } });

  const trails = await prisma.trail.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true, name: true, region: true, difficulty: true, distanceKm: true },
    take: 50,
  });

  let created = 0;

  for (const u of users) {
    const saved = await prisma.savedTrail.findMany({
      where: { userId: u.id },
      select: { trail: { select: { region: true } } },
      take: 50,
    });

    const regionCount: Record<string, number> = {};
    for (const s of saved) {
      regionCount[s.trail.region] = (regionCount[s.trail.region] ?? 0) + 1;
    }

    const topRegion = Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const picks = topRegion ? trails.filter((t) => t.region === topRegion).slice(0, 3) : trails.slice(0, 3);

    const body = picks
      .map((t, i) => `${i + 1}. ${t.name} (${t.region}) • ${t.difficulty} • ${t.distanceKm} km`)
      .join("\n");

    await prisma.notification.create({
      data: {
        userId: u.id,
        title: "Weekly picks for you",
        body,
      },
    });

    created++;
  }

  return NextResponse.json({ ok: true, usersProcessed: users.length, notificationsCreated: created });
}