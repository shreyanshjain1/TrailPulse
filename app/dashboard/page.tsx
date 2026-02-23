// app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { auth } from "@/src/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  // Get user from DB (guaranteed object-level source of truth)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!user) redirect("/signin");

  const [savedCount, planCount, unreadCount] = await Promise.all([
    prisma.savedTrail.count({ where: { userId: user.id } }),
    prisma.hikePlan.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  const upcoming = await prisma.hikePlan.findMany({
    where: { userId: user.id },
    orderBy: { startAt: "asc" },
    take: 5,
    include: { trail: true, calendarLink: true },
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-sky-500/10 to-violet-500/10" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-2xl font-semibold tracking-tight">
                Adventure Dashboard{user.name ? `, ${user.name}` : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                Plan smart hikes, track conditions, and sync everything to Google Calendar.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/trails">Explore trails</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/notifications">View notifications</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/activity">Activity log</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Saved trails</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-semibold">{savedCount}</div>
            <Button variant="outline" asChild>
              <Link href="/trails">Browse</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Hike plans</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-semibold">{planCount}</div>
            <Button variant="outline" asChild>
              <Link href="#upcoming">See upcoming</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Unread</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-4xl font-semibold">{unreadCount}</div>
            <Button variant="outline" asChild>
              <Link href="/notifications">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <Card id="upcoming">
        <CardHeader>
          <CardTitle>Upcoming hikes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No plans yet. Go to{" "}
              <Link className="underline" href="/trails">
                Trails
              </Link>{" "}
              and create your first hike plan.
            </div>
          ) : (
            upcoming.map((p) => (
              <Link
                key={p.id}
                href={`/plans/${p.id}`}
                className="block rounded-xl border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.trail.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(p.startAt).toLocaleString()} • {p.durationMin} min
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.calendarLink ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                        Calendar synced
                      </Badge>
                    ) : null}
                    <Badge variant="outline">{p.trail.difficulty}</Badge>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}