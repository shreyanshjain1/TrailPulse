import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Required for Google Calendar API usage
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().url(),

  // Optional: weather provider
  WEATHER_API_KEY: z.string().optional(),

  // Comma-separated list of emails that should be admins
  ADMIN_EMAILS: z.string().optional(),

  // Job schedules
  WEATHER_SYNC_EVERY_HOURS: z.coerce.number().int().min(1).max(24).default(6),
  DIGEST_HOUR_LOCAL: z.coerce.number().int().min(0).max(23).default(8),

  // Rate limit
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(500).default(30)
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALENDAR_REDIRECT_URI: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  WEATHER_API_KEY: process.env.WEATHER_API_KEY,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  WEATHER_SYNC_EVERY_HOURS: process.env.WEATHER_SYNC_EVERY_HOURS,
  DIGEST_HOUR_LOCAL: process.env.DIGEST_HOUR_LOCAL,
  RATE_LIMIT_WINDOW_SEC: process.env.RATE_LIMIT_WINDOW_SEC,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX
});
