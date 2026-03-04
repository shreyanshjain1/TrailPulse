import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `checkAll:${user.id}`,
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

    const plan = await prisma.hikePlan.findUnique({
      where: { id: parsed.data.planId },
      select: { id: true, userId: true },
    });
    if (!plan) return jsonError("Plan not found", 404);
    if (plan.userId !== user.id) {
      await audit({
        userId: user.id,
        action: "AUTHZ_DENIED",
        target: parsed.data.planId,
        meta: { resource: "HikePlan" },
        ip,
        ua,
      });
      return jsonError("Forbidden", 403);
    }

    const result = await prisma.checklistItem.updateMany({
      where: { planId: plan.id, isDone: false },
      data: { isDone: true },
    });

    await audit({
      userId: user.id,
      action: "JOB_RUN",
      target: "plan:checklist:mark-all",
      meta: { planId: plan.id, updated: result.count },
      ip,
      ua,
    });

    return jsonOk({ ok: true, updated: result.count });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
