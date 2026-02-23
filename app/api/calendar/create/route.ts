import { prisma } from "@/src/server/prisma";
import { calendarCreateSchema } from "@/src/server/validators";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow, ensureOwnsPlan } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { createCalendarEvent, deleteCalendarEvent } from "@/src/server/googleCalendar";
import { audit } from "@/src/server/audit";

function buildDescription(notes: string | null, checklist: { text: string; isDone: boolean }[]) {
  const lines: string[] = [];
  if (notes?.trim()) {
    lines.push("Notes:");
    lines.push(notes.trim());
    lines.push("");
  }
  if (checklist.length) {
    lines.push("Checklist:");
    for (const item of checklist) {
      lines.push(`- [${item.isDone ? "x" : " "}] ${item.text}`);
    }
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `calendarCreate:${user.id}`, max: 6, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = calendarCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const owns = await ensureOwnsPlan(user.id, parsed.data.planId);
    if (!owns) {
      await audit({ userId: user.id, action: "AUTHZ_DENIED", target: parsed.data.planId, meta: { resource: "HikePlan" }, ip, ua });
      return jsonError("Forbidden", 403);
    }

    const plan = await prisma.hikePlan.findUnique({
      where: { id: parsed.data.planId },
      include: { trail: true, checklist: true, calendarLink: true }
    });
    if (!plan) return jsonError("Plan not found", 404);

    const endAt = new Date(plan.startAt.getTime() + plan.durationMin * 60_000);
    const title = `Hike: ${plan.trail.name}`;
    const description = buildDescription(plan.notes ?? null, plan.checklist.map((c) => ({ text: c.text, isDone: c.isDone })));

    const eventId = await createCalendarEvent({
      userId: user.id,
      planId: plan.id,
      title,
      description,
      startAt: plan.startAt,
      endAt
    });

    await audit({ userId: user.id, action: "CALENDAR_CREATE", target: plan.id, meta: { eventId }, ip, ua });

    return jsonOk({ eventId });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "NO_REFRESH_TOKEN") {
      return jsonError("Google access needs re-consent. Sign out and sign in again.", 400);
    }
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}

export async function DELETE(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireUserOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `calendarDelete:${user.id}`, max: 6, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = calendarCreateSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const owns = await ensureOwnsPlan(user.id, parsed.data.planId);
    if (!owns) {
      await audit({ userId: user.id, action: "AUTHZ_DENIED", target: parsed.data.planId, meta: { resource: "HikePlan" }, ip, ua });
      return jsonError("Forbidden", 403);
    }

    await deleteCalendarEvent({ userId: user.id, planId: parsed.data.planId });
    await audit({ userId: user.id, action: "CALENDAR_DELETE", target: parsed.data.planId, ip, ua });

    return jsonOk({ deleted: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
