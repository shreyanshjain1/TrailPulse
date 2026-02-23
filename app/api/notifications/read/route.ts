import { prisma } from "@/src/server/prisma";
import { notificationReadSchema } from "@/src/server/validators";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow, ensureOwnsNotification } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `notifRead:${user.id}`, max: 30, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = notificationReadSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const ok = await ensureOwnsNotification(user.id, parsed.data.notificationId);
    if (!ok) {
      await audit({ userId: user.id, action: "AUTHZ_DENIED", target: parsed.data.notificationId, meta: { resource: "Notification" }, ip, ua });
      return jsonError("Forbidden", 403);
    }

    await prisma.notification.update({ where: { id: parsed.data.notificationId }, data: { isRead: true } });
    return jsonOk({ read: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
