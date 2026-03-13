import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const trailIds = Array.isArray(body?.trailIds) ? body.trailIds.map(String) : [];
  const ids = Array.from(new Set(trailIds)).slice(0, 3); // limit to 3 for UX/perf

  if (ids.length < 2) return NextResponse.json({ ok: false, error: "Select at least 2 trails" }, { status: 400 });

  const trails = await prisma.trail.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      region: true,
      difficulty: true,
      distanceKm: true,
      elevationGainM: true,
      imageUrl: true,
      updatedAt: true,
    },
  });

  const weather = await prisma.weatherSnapshot.findMany({
    where: { trailId: { in: ids } },
    orderBy: { fetchedAt: "desc" },
    select: { trailId: true, fetchedAt: true, payload: true },
  });

  // pick latest per trail
  const latestByTrail: Record<string, any> = {};
  for (const w of weather) {
    if (!latestByTrail[w.trailId]) latestByTrail[w.trailId] = w;
  }

  return NextResponse.json({
    ok: true,
    trails: trails.map((t) => ({
      ...t,
      weather: latestByTrail[t.id]
        ? { fetchedAt: latestByTrail[t.id].fetchedAt, payload: latestByTrail[t.id].payload }
        : null,
    })),
  });
}