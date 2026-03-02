import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { NotificationsList } from "@/src/components/notifications-list";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Digests, job updates, and alerts. Mark items read to clear your badge.
        </p>
      </section>

      <NotificationsList initial={notifications as any} />
    </div>
  );
}