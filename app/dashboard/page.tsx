import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/src/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const userId = session.user.id;

  const [savedCount, planCount, unreadCount, upcoming] = await Promise.all([
    prisma.savedTrail.count({ where: { userId } }),
    prisma.hikePlan.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.hikePlan.findMany({
      where: { userId, startAt: { gte: new Date() } },
      include: { trail: true, calendarLink: true },
      orderBy: { startAt: "asc" },
      take: 5
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Plan smart hikes and keep everything synced.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Saved trails</CardTitle>
            <CardDescription>Your favorites and planned options</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{savedCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hike plans</CardTitle>
            <CardDescription>All your upcoming and past plans</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{planCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unread</CardTitle>
            <CardDescription>Notifications waiting for you</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{unreadCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming hikes</CardTitle>
          <CardDescription>Next plans on your schedule</CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              No upcoming hikes yet. Browse trails and create a plan.
              <div className="mt-3">
                <Link href="/trails" className="underline">Browse trails</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div>
                    <div className="font-medium">
                      <Link href={`/plans/${p.id}`} className="hover:underline">
                        {p.trail.name}
                      </Link>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {format(p.startAt, "PPpp")} • {p.durationMin} min
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.calendarLink ? <Badge variant="success">Calendar synced</Badge> : <Badge>Not synced</Badge>}
                    <Badge>{p.trail.difficulty}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
