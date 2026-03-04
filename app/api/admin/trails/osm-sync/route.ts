// app/api/admin/trails/osm-sync/route.ts
import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { fetchOsmHikingRoute } from "@/src/server/osm";
import { z } from "zod";

const schema = z.object({
  trailId: z.string().min(10),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });
    if (user.role !== "ADMIN") return jsonError("Forbidden", 403);

    const rl = await rateLimit({
      key: `osmSync:${user.id}`,
      max: 10,
      windowSec: 60,
      userId: user.id,
      ip,
      ua,
    });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const trail = await prisma.trail.findUnique({
      where: { id: parsed.data.trailId },
      select: { id: true, name: true, lat: true, lng: true },
    });
    if (!trail) return jsonError("Trail not found", 404);

    const { feature, sections } = await fetchOsmHikingRoute({
      lat: trail.lat,
      lng: trail.lng,
      name: trail.name,
    });

    if (!feature) {
      await audit({
        userId: user.id,
        action: "JOB_RUN",
        target: `osm-sync:${trail.id}`,
        meta: { result: "no-route-found" },
        ip,
        ua,
      });
      return jsonOk({ ok: true, updated: false, reason: "No OSM route geometry found nearby" });
    }

    await prisma.trail.update({
      where: { id: trail.id },
      data: {
        routeGeoJson: feature as any,
        routeSections: sections as any,
      },
    });

    await audit({
      userId: user.id,
      action: "JOB_RUN",
      target: `osm-sync:${trail.id}`,
      meta: { result: "updated", points: feature.geometry.coordinates.length },
      ip,
      ua,
    });

    return jsonOk({ ok: true, updated: true, points: feature.geometry.coordinates.length });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}