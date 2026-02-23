/*
  Warnings:

  - The values [PLAN_UPDATE] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `calendarId` on the `CalendarEventLink` table. All the data in the column will be lost.
  - You are about to drop the column `finishedAt` on the `JobRun` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `JobRun` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `imageUrl` to the `Trail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Trail` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('SIGN_IN', 'SIGN_OUT', 'SAVE_TRAIL', 'UNSAVE_TRAIL', 'PLAN_CREATE', 'PLAN_DELETE', 'CALENDAR_CREATE', 'CALENDAR_DELETE', 'JOB_RUN', 'AUTHZ_DENIED', 'RATE_LIMITED');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "AuditAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_action_createdAt_idx";

-- DropIndex
DROP INDEX "HikePlan_startAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_createdAt_idx";

-- DropIndex
DROP INDEX "SavedTrail_userId_idx";

-- DropIndex
DROP INDEX "Trail_distanceKm_idx";

-- DropIndex
DROP INDEX "Trail_elevationGainM_idx";

-- DropIndex
DROP INDEX "WeatherSnapshot_trailId_fetchedAt_idx";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "CalendarEventLink" DROP COLUMN "calendarId";

-- AlterTable
ALTER TABLE "JobRun" DROP COLUMN "finishedAt",
DROP COLUMN "startedAt";

-- AlterTable
ALTER TABLE "Trail" ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trailId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_trailId_createdAt_idx" ON "Review"("trailId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "WeatherSnapshot_trailId_idx" ON "WeatherSnapshot"("trailId");

-- CreateIndex
CREATE INDEX "WeatherSnapshot_fetchedAt_idx" ON "WeatherSnapshot"("fetchedAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_trailId_fkey" FOREIGN KEY ("trailId") REFERENCES "Trail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
