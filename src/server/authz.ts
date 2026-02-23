import { auth } from "@/src/auth";
import { prisma } from "@/src/server/prisma";
import { audit } from "@/src/server/audit";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireUserOrThrow(ctx: { ip?: string | null; ua?: string | null }) {
  const user = await requireUser();
  if (!user) {
    await audit({ userId: null, action: "AUTHZ_DENIED", target: "anonymous", meta: { reason: "not_authenticated" }, ip: ctx.ip ?? null, ua: ctx.ua ?? null });
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdminOrThrow(ctx: { ip?: string | null; ua?: string | null }) {
  const user = await requireUserOrThrow(ctx);
  if (user.role !== "ADMIN") {
    await audit({ userId: user.id, action: "AUTHZ_DENIED", target: "admin_only", meta: { reason: "not_admin" }, ip: ctx.ip ?? null, ua: ctx.ua ?? null });
    throw new Error("FORBIDDEN");
  }
  return user;
}

// Object-level checks
export async function ensureOwnsPlan(userId: string, planId: string) {
  const plan = await prisma.hikePlan.findFirst({ where: { id: planId, userId }, select: { id: true } });
  return !!plan;
}

export async function ensureOwnsSavedTrail(userId: string, trailId: string) {
  const st = await prisma.savedTrail.findFirst({ where: { userId, trailId }, select: { id: true } });
  return !!st;
}

export async function ensureOwnsNotification(userId: string, notificationId: string) {
  const n = await prisma.notification.findFirst({ where: { id: notificationId, userId }, select: { id: true } });
  return !!n;
}
