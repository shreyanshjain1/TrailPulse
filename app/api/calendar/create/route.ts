import { prisma } from "@/src/server/prisma";
import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { google } from "googleapis";
import { z } from "zod";

const schema = z.object({
  planId: z.string().min(1),
});

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `calCreate:${user.id}`,
      max: 10,
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
      include: {
        trail: true,
        checklist: { orderBy: { sortOrder: "asc" } },
        calendarLink: true,
        user: { include: { accounts: true } },
      },
    });

    if (!plan) return jsonError("Plan not found", 404);
    if (plan.userId !== user.id) return jsonError("Forbidden", 403);
    if (plan.calendarLink) return jsonOk({ ok: true, already: true });

    const account = plan.user.accounts.find((a) => a.provider === "google");
    if (!account?.access_token) {
      return jsonError("Google access token missing. Sign out and sign in again.", 400);
    }

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI
    );

    oauth2.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token ?? undefined,
    });

    const cal = google.calendar({ version: "v3", auth: oauth2 });

    const start = new Date(plan.startAt);
    const end = new Date(start.getTime() + plan.durationMin * 60 * 1000);

    const checklistText =
      plan.checklist.length > 0
        ? "\n\nChecklist:\n" + plan.checklist.map((c) => `- ${c.text}`).join("\n")
        : "";

    const event = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Hike: ${plan.trail.name}`,
        description: (plan.notes ?? "") + checklistText,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    const eventId = event.data.id;
    if (!eventId) return jsonError("Calendar event creation failed", 500);

    await prisma.calendarEventLink.create({
      data: { planId: plan.id, eventId },
    });

    await audit({
      userId: user.id,
      action: "CALENDAR_CREATE",
      target: plan.id,
      meta: { eventId },
      ip,
      ua,
    });

    return jsonOk({ ok: true, eventId });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    return jsonError(msg, 500);
  }
}