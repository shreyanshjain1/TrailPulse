// src/server/audit.ts
import { prisma } from "@/src/server/prisma";

export type AuditAction =
  | "SIGN_IN"
  | "SIGN_OUT"
  | "SAVE_TRAIL"
  | "UNSAVE_TRAIL"
  | "PLAN_CREATE"
  | "PLAN_DELETE"
  | "CALENDAR_CREATE"
  | "CALENDAR_DELETE"
  | "JOB_RUN"
  | "AUTHZ_DENIED"
  | "RATE_LIMITED";

type AuditInput = {
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  target?: string | null;
  meta?: unknown;
  ip?: string | null;
  ua?: string | null;
};

export async function audit(input: AuditInput) {
  const { userId, userEmail, action, target, meta, ip, ua } = input;

  // Resolve a real DB userId (avoid FK violations during first-time auth race)
  let resolvedUserId: string | null = null;

  if (userId) {
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (exists) resolvedUserId = exists.id;
  }

  if (!resolvedUserId && userEmail) {
    const u = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    });
    if (u) resolvedUserId = u.id;
  }

  // If we still can't resolve a real userId, skip logging instead of crashing auth.
  if (!resolvedUserId) return;

  await prisma.auditLog.create({
    data: {
      userId: resolvedUserId,
      action,
      target: target ?? null,
      meta: meta as any,
      ip: ip ?? null,
      ua: ua ?? null,
    },
  });
}