import { prisma } from "@/src/server/prisma";
import { planCreateSchema } from "@/src/server/validators";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { weatherSyncQueue } from "@/src/server/queues";

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `planCreate:${user.id}`, max: 10, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = planCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const trail = await prisma.trail.findUnique({ where: { id: parsed.data.trailId }, select: { id: true, name: true } });
    if (!trail) return jsonError("Trail not found", 404);

    const startAt = new Date(parsed.data.startAt);
    if (isNaN(startAt.getTime())) return jsonError("Invalid date/time", 400);

    const plan = await prisma.hikePlan.create({
      data: {
        userId: user.id,
        trailId: trail.id,
        startAt,
        durationMin: parsed.data.durationMin,
        notes: parsed.data.notes ?? null,
        checklist: {
          create: (parsed.data.checklist ?? []).map((text, i) => ({ text, sortOrder: i }))
        }
      },
      include: { trail: true }
    });

    await audit({ userId: user.id, action: "PLAN_CREATE", target: plan.id, meta: { trailId: trail.id }, ip, ua });

    // Fire-and-forget: refresh conditions for this trail
    weatherSyncQueue.add("weatherSync", { trigger: "planCreate", trailId: trail.id }).catch(() => {});

    return jsonOk({ planId: plan.id });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
