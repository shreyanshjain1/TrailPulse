import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { requireUserOrThrow } from "@/src/server/authz";
import { getIpUa, jsonError, jsonOk } from "@/src/server/http";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `planShareRevoke:${user.id}`,
      max: 12,
      windowSec: 60,
      userId: user.id,
      ip,
      ua,
    });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json().catch(() => null);
    const planId = body?.planId ? String(body.planId) : "";
    if (!planId) return jsonError("Missing planId", 400);

    const plan = await prisma.hikePlan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true },
    });
    if (!plan) return jsonError("Plan not found", 404);
    if (plan.userId !== user.id) return jsonError("Forbidden", 403);

    await prisma.hikePlan.update({
      where: { id: planId },
      data: { shareEnabled: false, shareToken: null, shareExpiresAt: null },
    });

    await audit({
      userId: user.id,
      action: "PLAN_SHARE_REVOKE",
      target: planId,
      meta: {},
      ip,
      ua,
    });

    return jsonOk({ revoked: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }
}