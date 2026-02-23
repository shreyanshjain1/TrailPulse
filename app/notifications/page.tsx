import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { NotificationsList } from "@/src/components/notifications-list";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Digests and trail updates from background jobs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsList initial={notifications} />
        </CardContent>
      </Card>
    </div>
  );
}
