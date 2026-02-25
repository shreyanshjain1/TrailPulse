import { z } from "zod";

export const trailFiltersSchema = z.object({
  q: z.string().optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD"]).optional(),
  minDistance: z.coerce.number().min(0).optional(),
  maxDistance: z.coerce.number().min(0).optional(),
  minElevation: z.coerce.number().min(0).optional(),
  maxElevation: z.coerce.number().min(0).optional(),
  nearOnly: z.coerce.boolean().optional(),
});

export const saveTrailSchema = z.object({
  trailId: z.string().min(1, "trailId is required"),
});

export const unsaveTrailSchema = z.object({
  trailId: z.string().min(1, "trailId is required"),
});

export const createPlanSchema = z.object({
  trailId: z.string().min(1),
  startAt: z.string().datetime(),
  durationMin: z.coerce.number().int().min(30).max(24 * 60),
  notes: z.string().max(5000).optional().or(z.literal("")),
  checklist: z
    .array(
      z.object({
        text: z.string().min(1).max(200),
        isDone: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

export const createCalendarEventSchema = z.object({
  planId: z.string().min(1),
});

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1),
});

export const updateProfileLocationSchema = z.object({
  homeLabel: z.string().max(120).optional().or(z.literal("")),
  homeLat: z.coerce.number().min(-90).max(90).optional(),
  homeLng: z.coerce.number().min(-180).max(180).optional(),
});

export const reviewSchema = z.object({
  trailId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().or(z.literal("")),
});