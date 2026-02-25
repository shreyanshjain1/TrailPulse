import { prisma } from "@/src/server/prisma";
import { trailFiltersSchema } from "@/src/server/validators";
import { haversineKm } from "@/src/server/geo";

type ListTrailsOptions = {
  raw?: unknown;
  userId?: string | null;
};

export async function listTrails(options: ListTrailsOptions = {}) {
  const { raw, userId } = options;
  const f = trailFiltersSchema.parse(raw ?? {});

  const [trails, user] = await Promise.all([
    prisma.trail.findMany({
      where: {
        AND: [
          f.q
            ? {
                OR: [
                  { name: { contains: f.q, mode: "insensitive" } },
                  { region: { contains: f.q, mode: "insensitive" } },
                  { summary: { contains: f.q, mode: "insensitive" } },
                ],
              }
            : {},
          f.difficulty ? { difficulty: f.difficulty } : {},
          f.minDistanceKm != null ? { distanceKm: { gte: f.minDistanceKm } } : {},
          f.maxDistanceKm != null ? { distanceKm: { lte: f.maxDistanceKm } } : {},
          f.minElevationGainM != null
            ? { elevationGainM: { gte: f.minElevationGainM } }
            : {},
          f.maxElevationGainM != null
            ? { elevationGainM: { lte: f.maxElevationGainM } }
            : {},
        ],
      },
      include: {
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            homeLabel: true,
            homeLat: true,
            homeLng: true,
          },
        })
      : Promise.resolve(null),
  ]);

  const hasHome =
    user?.homeLat != null && user?.homeLng != null && Number.isFinite(user.homeLat) && Number.isFinite(user.homeLng);

  const mapped = trails.map((t) => {
    const avgRating =
      t.reviews.length > 0
        ? Number(
            (
              t.reviews.reduce((sum, r) => sum + r.rating, 0) / t.reviews.length
            ).toFixed(1)
          )
        : null;

    const distanceFromStartKm = hasHome
      ? haversineKm(user!.homeLat!, user!.homeLng!, t.lat, t.lng)
      : null;

    return {
      ...t,
      avgRating,
      reviewCount: t.reviews.length,
      distanceFromStartKm,
    };
  });

  if (hasHome) {
    mapped.sort((a, b) => {
      if (a.distanceFromStartKm == null && b.distanceFromStartKm == null) return 0;
      if (a.distanceFromStartKm == null) return 1;
      if (b.distanceFromStartKm == null) return -1;
      return a.distanceFromStartKm - b.distanceFromStartKm;
    });
  }

  return {
    trails: mapped,
    homeLocation:
      hasHome
        ? {
            label: user?.homeLabel || "Saved start location",
            lat: user!.homeLat!,
            lng: user!.homeLng!,
          }
        : null,
  };
}