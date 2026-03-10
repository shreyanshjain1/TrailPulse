import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/src/server/prisma";
import { requireUserOrThrow } from "@/src/server/authz";
import { getIpUa, jsonError, jsonOk } from "@/src/server/http";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";

function makeToken() {
  return crypto.randomBytes(24).toString("base64url"); // ~32 chars url-safe
}

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `planShareCreate:${user.id}`,
      max: 12,
      windowSec: 60,
      userId: user.id,
      ip,
      ua,
    });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json().catch(() => null);
    const planId = body?.planId ? String(body.planId) : "";
    const expiresInDaysRaw = body?.expiresInDays;
    const expiresInDays =
      typeof expiresInDaysRaw === "number" ? expiresInDaysRaw : parseInt(String(expiresInDaysRaw ?? "7"), 10);

    if (!planId) return jsonError("Missing planId", 400);
    if (![1, 7, 30].includes(expiresInDays)) return jsonError("Invalid expiresInDays", 400);

    const plan = await prisma.hikePlan.findUnique({
      where: { id: planId },
      select: { id: true, userId: true, shareEnabled: true, shareToken: true, shareExpiresAt: true },
    });
    if (!plan) return jsonError("Plan not found", 404);
    if (plan.userId !== user.id) return jsonError("Forbidden", 403);

    // If already enabled + valid token, rotate anyway (security best practice)
    const token = makeToken();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await prisma.hikePlan.update({
      where: { id: planId },
      data: {
        shareEnabled: true,
        shareToken: token,
        shareExpiresAt: expiresAt,
      },
    });

    await audit({
      userId: user.id,
      action: "PLAN_SHARE_CREATE",
      target: planId,
      meta: { expiresInDays },
      ip,
      ua,
    });

    return jsonOk({ token, expiresAt: expiresAt.toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: "Request failed" }, { status: 500 });
  }
}