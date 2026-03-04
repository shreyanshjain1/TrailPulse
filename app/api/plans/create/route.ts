import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { z } from "zod";

const schema = z.object({
  trailId: z.string().min(1),
  startAt: z.string().datetime(),
  durationMin: z
    .number()
    .int()
    .min(30)
    .max(24 * 60),
  notes: z.string().max(5000).nullable().optional(),
  checklist: z.array(z.string().min(1).max(200)).max(60).optional(),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `planCreate:${user.id}`,
      max: 20,
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
      select: { id: true, name: true },
    });
    if (!trail) return jsonError("Trail not found", 404);

    const plan = await prisma.hikePlan.create({
      data: {
        userId: user.id,
        trailId: parsed.data.trailId,
        startAt: new Date(parsed.data.startAt),
        durationMin: parsed.data.durationMin,
        notes: parsed.data.notes ?? null,
      },
      select: { id: true },
    });

    const items = (parsed.data.checklist ?? [])
      .map((t, idx) => ({ planId: plan.id, text: t, isDone: false, sortOrder: idx }))
      .slice(0, 60);

    if (items.length > 0) {
      await prisma.checklistItem.createMany({ data: items });
    }

    await audit({
      userId: user.id,
      action: "PLAN_CREATE",
      target: plan.id,
      meta: { trailId: parsed.data.trailId, checklistCount: items.length },
      ip,
      ua,
    });

    return jsonOk({ planId: plan.id });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
