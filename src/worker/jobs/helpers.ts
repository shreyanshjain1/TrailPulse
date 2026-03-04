import type { PrismaClient } from "@prisma/client";

export function nowUtc() {
  return new Date();
}

export function msUntil(d: Date) {
  return d.getTime() - Date.now();
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function createJobRun(prisma: PrismaClient, input: {
  queue: string;
  jobId: string;
  name: string;
  status: string;
  attempts: number;
  error?: string | null;
}) {
  await prisma.jobRun.create({
    data: {
      queue: input.queue,
      jobId: input.jobId,
      name: input.name,
      status: input.status,
      attempts: input.attempts,
      error: input.error ?? null,
    },
  });
}

export async function ensureNotificationOnce(prisma: PrismaClient, input: {
  userId: string;
  dedupeKey: string; // stored in title
  title: string;
  body: string;
}) {
  // Dedupe by title containing key prefix. Keeps schema unchanged.
  const existing = await prisma.notification.findFirst({
    where: {
      userId: input.userId,
      title: input.dedupeKey,
    },
    select: { id: true },
  });

  if (existing) return { created: false };

  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.dedupeKey, // keep title as dedupeKey for exact match
      body: `${input.title}\n\n${input.body}`.trim(),
      isRead: false,
    },
  });

  return { created: true };
}