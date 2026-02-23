import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { saveTrailSchema } from "@/src/server/validators";
import { requireUserOrThrow } from "@/src/server/authz";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { rateLimit } from "@/src/server/rateLimit";
import { weatherSyncQueue } from "@/src/server/queues";
import { audit } from "@/src/server/audit";

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `saveTrail:${user.id}`, max: 30, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = saveTrailSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    // Ensure trail exists
    const trail = await prisma.trail.findUnique({ where: { id: parsed.data.trailId }, select: { id: true } });
    if (!trail) return jsonError("Trail not found", 404);

    await prisma.savedTrail.upsert({
      where: { userId_trailId: { userId: user.id, trailId: parsed.data.trailId } },
      update: {},
      create: { userId: user.id, trailId: parsed.data.trailId }
    });

    await audit({ userId: user.id, action: "SAVE_TRAIL", target: parsed.data.trailId, ip, ua });

    // Fire-and-forget: kick a weather sync soon
    weatherSyncQueue.add("weatherSync", { trigger: "saveTrail", trailId: parsed.data.trailId }).catch(() => {});

    return jsonOk({ saved: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}

export async function DELETE(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `unsaveTrail:${user.id}`, max: 30, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = saveTrailSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    await prisma.savedTrail.deleteMany({ where: { userId: user.id, trailId: parsed.data.trailId } });
    await audit({ userId: user.id, action: "UNSAVE_TRAIL", target: parsed.data.trailId, ip, ua });

    return jsonOk({ saved: false });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
