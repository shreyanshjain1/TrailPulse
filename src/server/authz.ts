import { auth } from "@/src/auth";
import { prisma } from "@/src/server/prisma";

export type AuthedUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
};

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireUser(): Promise<AuthedUser | null> {
  const session = await auth();

  const userId = (session?.user as any)?.id as string | undefined;
  const email = session?.user?.email ? String(session.user.email).toLowerCase() : "";

  if (!userId || !email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!dbUser) return null;

  const admins = parseAdminEmails();
  if (admins.includes(dbUser.email.toLowerCase()) && dbUser.role !== "ADMIN") {
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
    return { id: updated.id, email: updated.email, name: updated.name, role: updated.role };
  }

  return { id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role };
}

export async function requireUserOrThrow(): Promise<AuthedUser> {
  const u = await requireUser();
  if (!u) throw new Error("UNAUTHORIZED");
  return u;
}

export function assertOwnerOrThrow(ownerId: string, currentUserId: string) {
  if (ownerId !== currentUserId) throw new Error("FORBIDDEN");
}