import { prisma } from "@/src/server/prisma";
import type { AuditAction } from "@prisma/client";

type AuditInput = {
  userId: string | null;
  action: AuditAction;
  target?: string | null;
  meta?: unknown;
  ip?: string | null;
  ua?: string | null;
};

export async function audit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        target: input.target ?? null,
        meta: input.meta as any,
        ip: input.ip ?? null,
        ua: input.ua ?? null
      }
    });
  } catch {
    // Never block user flows on logging
  }
}
