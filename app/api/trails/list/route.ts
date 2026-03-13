import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

export async function GET() {
  const trails = await prisma.trail.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      region: true,
      difficulty: true,
      distanceKm: true,
      elevationGainM: true,
      imageUrl: true,
    },
    take: 500,
  });

  return NextResponse.json({ ok: true, trails });
}