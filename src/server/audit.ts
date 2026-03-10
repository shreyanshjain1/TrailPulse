import { prisma } from "@/src/server/prisma";
import type { AuditAction } from "@prisma/client";

export async function audit(opts: {
  userId: string;
  action: AuditAction | string;
  target?: string | null;
  meta?: any;
  ip?: string | null;
  ua?: string | null;
}) {
  try {
    // AuditAction is an enum in Prisma; but during development you might pass custom strings.
    // Cast safely.
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        action: opts.action as any,
        target: opts.target ?? null,
        meta: opts.meta ?? null,
        ip: opts.ip ?? null,
        ua: opts.ua ?? null,
      },
    });
  } catch {
    // Never crash main request due to audit logging
  }
}