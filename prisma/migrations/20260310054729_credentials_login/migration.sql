/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `HikePlan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PLAN_SHARE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'PLAN_SHARE_REVOKE';

-- AlterTable
ALTER TABLE "HikePlan" ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HikePlan_shareToken_key" ON "HikePlan"("shareToken");
