import { google } from "googleapis";
import { prisma } from "@/src/server/prisma";
import { env } from "@/src/env";

export async function getGoogleClientForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { access_token: true, refresh_token: true, expires_at: true }
  });

  if (!account?.refresh_token) {
    // If the user previously signed in without offline access, they may lack refresh_token.
    // Re-consent fixes it (we prompt consent in provider config).
    throw new Error("NO_REFRESH_TOKEN");
  }

  const oauth2 = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALENDAR_REDIRECT_URI
  );

  oauth2.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined
  });

  // Auto-refresh tokens when needed
  oauth2.on("tokens", async (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token) return;

    await prisma.account.updateMany({
      where: { userId, provider: "google" },
      data: {
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined
      }
    });
  });

  return oauth2;
}

export async function createCalendarEvent(opts: {
  userId: string;
  planId: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
}) {
  const auth = await getGoogleClientForUser(opts.userId);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: opts.title,
      description: opts.description,
      start: { dateTime: opts.startAt.toISOString() },
      end: { dateTime: opts.endAt.toISOString() }
    }
  });

  const eventId = res.data.id;
  if (!eventId) throw new Error("CALENDAR_CREATE_FAILED");

  await prisma.calendarEventLink.upsert({
    where: { planId: opts.planId },
    update: { eventId, calendarId: "primary" },
    create: { planId: opts.planId, eventId, calendarId: "primary" }
  });

  return eventId;
}

export async function deleteCalendarEvent(opts: { userId: string; planId: string }) {
  const link = await prisma.calendarEventLink.findUnique({ where: { planId: opts.planId } });
  if (!link) return;

  const auth = await getGoogleClientForUser(opts.userId);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.delete({ calendarId: link.calendarId, eventId: link.eventId });
  await prisma.calendarEventLink.delete({ where: { planId: opts.planId } });
}
