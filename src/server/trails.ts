import { prisma } from "@/src/server/prisma";
import { z } from "zod";

export const trailFiltersSchema = z.object({
  q: z.string().optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD"]).optional(),
  minDistance: z.coerce.number().min(0).optional(),
  maxDistance: z.coerce.number().min(0).optional(),
  minElevation: z.coerce.number().min(0).optional(),
  maxElevation: z.coerce.number().min(0).optional()
});

export async function listTrails(raw: unknown) {
  const f = trailFiltersSchema.parse(raw ?? {});
  return prisma.trail.findMany({
    where: {
      AND: [
        f.q
          ? {
              OR: [
                { name: { contains: f.q, mode: "insensitive" } },
                { region: { contains: f.q, mode: "insensitive" } }
              ]
            }
          : {},
        f.difficulty ? { difficulty: f.difficulty } : {},
        typeof f.minDistance === "number" ? { distanceKm: { gte: f.minDistance } } : {},
        typeof f.maxDistance === "number" ? { distanceKm: { lte: f.maxDistance } } : {},
        typeof f.minElevation === "number" ? { elevationGainM: { gte: Math.floor(f.minElevation) } } : {},
        typeof f.maxElevation === "number" ? { elevationGainM: { lte: Math.floor(f.maxElevation) } } : {}
      ]
    },
    orderBy: [{ region: "asc" }, { name: "asc" }]
  });
}
