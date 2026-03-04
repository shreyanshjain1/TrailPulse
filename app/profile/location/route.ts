import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { z } from "zod";

const schema = z.object({
  homeLabel: z.string().max(80).nullable().optional(),
  homeLat: z.number().min(-90).max(90).nullable().optional(),
  homeLng: z.number().min(-180).max(180).nullable().optional(),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `profileLoc:${user.id}`,
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

    const data = parsed.data;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        homeLabel: data.homeLabel ?? null,
        homeLat: data.homeLat ?? null,
        homeLng: data.homeLng ?? null,
      },
    });

    await audit({
      userId: user.id,
      action: "JOB_RUN",
      target: "profile:update-location",
      meta: { hasCoords: !!(data.homeLat && data.homeLng), label: data.homeLabel ?? null },
      ip,
      ua,
    });

    return jsonOk({ ok: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}