import { z } from "zod";

export const saveTrailSchema = z.object({
  trailId: z.string().min(1)
});

export const planCreateSchema = z.object({
  trailId: z.string().min(1),
  startAt: z.string().datetime(),
  durationMin: z.coerce.number().int().min(15).max(24 * 60),
  notes: z.string().max(5000).optional(),
  checklist: z.array(z.string().min(1).max(200)).max(50).optional()
});

export const calendarCreateSchema = z.object({
  planId: z.string().min(1)
});

export const notificationReadSchema = z.object({
  notificationId: z.string().min(1)
});

export const jobsRetrySchema = z.object({
  queue: z.enum(["weatherSync", "digest"]),
  jobId: z.string().min(1)
});
