import { google } from "googleapis";
import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { requireUserOrThrow } from "@/src/server/authz";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";
import { getIpUa } from "@/src/server/http";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function safeGoogleError(err: any) {
  // Do NOT leak tokens. Keep only useful debug info.
  const message = err?.message ?? "Unknown error";
  const code = err?.code ?? err?.response?.status ?? null;

  const data = err?.response?.data;
  const reason =
    data?.error?.message ??
    data?.error_description ??
    data?.error ??
    (typeof data === "string" ? data.slice(0, 200) : null);

  return { message, code, reason };
}

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);

  try {
    const user = await requireUserOrThrow({ ip, ua });

    const rl = await rateLimit({
      key: `calendarCreate:${user.id}`,
      max: 10,
      windowSec: 60,
      userId: user.id,
      ip,
      ua,
    });
    if (!rl.ok) return json(429, { ok: false, error: "Too many requests", retryAfterSec: rl.retryAfterSec });

    const body = await req.json().catch(() => null);
    const planId = body?.planId ? String(body.planId) : "";
    if (!planId) return json(400, { ok: false, error: "Missing planId" });

    const plan = await prisma.hikePlan.findUnique({
      where: { id: planId },
      include: { trail: true, calendarLink: true },
    });

    if (!plan) return json(404, { ok: false, error: "Plan not found" });
    if (plan.userId !== user.id) return json(403, { ok: false, error: "Forbidden" });

    // If already linked, return ok
    if (plan.calendarLink?.eventId) {
      return json(200, { ok: true, eventId: plan.calendarLink.eventId, alreadyLinked: true });
    }

    // Pull Auth.js account tokens (Prisma adapter stores in Account table)
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
        token_type: true,
        scope: true,
      },
    });

    // Without refresh_token you cannot reliably call Calendar from server
    if (!account?.refresh_token) {
      return json(400, {
        ok: false,
        error: "Google calendar access not granted (missing refresh token). Reconnect your Google account.",
        hint:
          "Fix: ensure Google provider requests offline access (access_type=offline) + prompt=consent so refresh_token is issued.",
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return json(500, { ok: false, error: "Server misconfigured: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET" });
    }

    const oauth2Client = new google.auth.OAuth2({
      clientId,
      clientSecret,
    });

    oauth2Client.setCredentials({
      access_token: account.access_token ?? undefined,
      refresh_token: account.refresh_token ?? undefined,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = new Date(plan.startAt);
    const end = new Date(start.getTime() + plan.durationMin * 60_000);

    const summary = `TrailPulse: ${plan.trail.name}`;
    const description = [
      `Trail: ${plan.trail.name}`,
      `Region: ${plan.trail.region ?? ""}`.trim(),
      `Distance: ${plan.trail.distanceKm} km`,
      `Elevation gain: ${plan.trail.elevationGainM} m`,
      `Plan link: ${process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/plans/${plan.id}`,
      plan.notes ? `Notes:\n${plan.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const eventRes = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    const eventId = eventRes.data.id;
    if (!eventId) return json(500, { ok: false, error: "Calendar event created but missing event id" });

    await prisma.calendarEventLink.create({
      data: {
        planId: plan.id,
        eventId,
      },
    });

    await audit({
      userId: user.id,
      action: "CALENDAR_EVENT_CREATE",
      target: plan.id,
      meta: { eventId },
      ip,
      ua,
    });

    return json(200, { ok: true, eventId });
  } catch (err: any) {
    const safe = safeGoogleError(err);
    // Return debug info in dev only
    const isDev = process.env.NODE_ENV !== "production";
    return json(500, { ok: false, error: "Calendar sync failed", ...(isDev ? { debug: safe } : {}) });
  }
}