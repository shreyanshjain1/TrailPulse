import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
  itemId: z.string().min(1),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `checkToggle:${user.id}`,
      max: 60,
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
      await audit({ userId: user.id, action: "AUTHZ_DENIED", target: parsed.data.planId, meta: { resource: "HikePlan" }, ip, ua });
      return jsonError("Forbidden", 403);
    }

    const item = await prisma.checklistItem.findUnique({
      where: { id: parsed.data.itemId },
      select: { id: true, planId: true, isDone: true },
    });
    if (!item || item.planId !== plan.id) return jsonError("Item not found", 404);

    await prisma.checklistItem.update({
      where: { id: item.id },
      data: { isDone: !item.isDone },
    });

    return jsonOk({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}