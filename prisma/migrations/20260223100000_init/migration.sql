-- TrailPulse initial schema (generated for PostgreSQL)

CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "AuditAction" AS ENUM (
  'SIGN_IN','SIGN_OUT','SAVE_TRAIL','UNSAVE_TRAIL','PLAN_CREATE','PLAN_UPDATE','PLAN_DELETE',
  'CALENDAR_CREATE','CALENDAR_DELETE','JOB_RUN','AUTHZ_DENIED','RATE_LIMITED'
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT
);

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")
);

CREATE TABLE "Trail" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "difficulty" "Difficulty" NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "elevationGainM" INTEGER NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "SavedTrail" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trailId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "SavedTrail_userId_trailId_key" UNIQUE ("userId", "trailId")
);

CREATE TABLE "HikePlan" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "trailId" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "durationMin" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ChecklistItem" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "isDone" BOOLEAN NOT NULL DEFAULT FALSE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "CalendarEventLink" (
  "id" TEXT PRIMARY KEY,
  "planId" TEXT NOT NULL UNIQUE,
  "eventId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "WeatherSnapshot" (
  "id" TEXT PRIMARY KEY,
  "trailId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "Notification" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "action" "AuditAction" NOT NULL,
  "target" TEXT,
  "meta" JSONB,
  "ip" TEXT,
  "ua" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE "JobRun" (
  "id" TEXT PRIMARY KEY,
  "queue" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedTrail" ADD CONSTRAINT "SavedTrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedTrail" ADD CONSTRAINT "SavedTrail_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HikePlan" ADD CONSTRAINT "HikePlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HikePlan" ADD CONSTRAINT "HikePlan_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HikePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventLink" ADD CONSTRAINT "CalendarEventLink_planId_fkey" FOREIGN KEY ("planId") REFERENCES "HikePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeatherSnapshot" ADD CONSTRAINT "WeatherSnapshot_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Trail_region_idx" ON "Trail"("region");
CREATE INDEX "Trail_difficulty_idx" ON "Trail"("difficulty");
CREATE INDEX "Trail_distanceKm_idx" ON "Trail"("distanceKm");
CREATE INDEX "Trail_elevationGainM_idx" ON "Trail"("elevationGainM");
CREATE INDEX "SavedTrail_userId_idx" ON "SavedTrail"("userId");
CREATE INDEX "SavedTrail_trailId_idx" ON "SavedTrail"("trailId");
CREATE INDEX "HikePlan_userId_idx" ON "HikePlan"("userId");
CREATE INDEX "HikePlan_trailId_idx" ON "HikePlan"("trailId");
CREATE INDEX "HikePlan_startAt_idx" ON "HikePlan"("startAt");
CREATE INDEX "ChecklistItem_planId_idx" ON "ChecklistItem"("planId");
CREATE INDEX "WeatherSnapshot_trailId_fetchedAt_idx" ON "WeatherSnapshot"("trailId","fetchedAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId","createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId","createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action","createdAt");
CREATE INDEX "JobRun_queue_createdAt_idx" ON "JobRun"("queue","createdAt");
