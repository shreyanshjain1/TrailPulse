import Link from "next/link";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return null;

  const [savedCount, planCount, unreadCount, upcomingPlans, recentSaved] = await Promise.all([
    prisma.savedTrail.count({ where: { userId: user.id } }),
    prisma.hikePlan.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.hikePlan.findMany({
      where: { userId: user.id },
      include: {
        trail: true,
        calendarLink: true,
      },
      orderBy: { startAt: "asc" },
      take: 4,
    }),
    prisma.savedTrail.findMany({
      where: { userId: user.id },
      include: { trail: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const statCards = [
    {
      title: "Saved trails",
      value: savedCount,
      sub: "Favorites and routes to compare",
      href: "/trails",
      accent: "from-emerald-500/15 to-emerald-500/5",
    },
    {
      title: "Hike plans",
      value: planCount,
      sub: "Upcoming + past scheduled hikes",
      href: "/dashboard",
      accent: "from-cyan-500/15 to-cyan-500/5",
    },
    {
      title: "Unread alerts",
      value: unreadCount,
      sub: "Notifications waiting for you",
      href: "/notifications",
      accent: "from-amber-500/15 to-amber-500/5",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-4 md:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.14),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(6,182,212,0.12),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.10),transparent_32%)]" />
        <div className="relative p-6 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-800">
                TrailPulse Dashboard
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
                Plan hikes, track saved trails, and stay weather-ready with a cleaner
                command center for your next outdoor trip.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/trails"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Explore trails
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Profile
              </Link>
              <Link
                href="/activity"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Activity log
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-3">
        {statCards.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-80`} />
            <div className="relative">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">{item.title}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.sub}</div>
              <div className="mt-3 text-xs font-medium text-emerald-700 transition group-hover:translate-x-0.5 dark:text-emerald-400">
                Open →
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Upcoming hikes */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Upcoming hikes</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Your next scheduled plans
              </p>
            </div>
            <Link
              href="/trails"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Plan another
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No plans yet. Go to{" "}
                <Link href="/trails" className="font-medium underline underline-offset-2">
                  Trails
                </Link>{" "}
                and click <b>Plan hike</b>.
              </div>
            ) : (
              upcomingPlans.map((p) => (
                <Link
                  key={p.id}
                  href={`/trails/${p.trailId}`}
                  className="group flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="line-clamp-1 font-semibold">{p.trail.name}</div>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(p.startAt).toLocaleString()} • {p.durationMin} min
                    </div>
                    {p.notes ? (
                      <div className="mt-1 line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {p.notes}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {p.calendarLink ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                        Calendar synced
                      </span>
                    ) : null}
                    <span className="rounded-full border border-zinc-200 px-2.5 py-1 dark:border-zinc-700">
                      {p.trail.difficulty}
                    </span>
                    <span className="rounded-full border border-zinc-200 px-2.5 py-1 dark:border-zinc-700">
                      {p.trail.distanceKm} km
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Right side */}
        <div className="space-y-6 lg:col-span-4">
          {/* Recent saved */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Saved trails</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Recently saved
                </p>
              </div>
              <Link href="/trails" className="text-sm font-medium underline underline-offset-2">
                See all
              </Link>
            </div>

            <div className="space-y-2">
              {recentSaved.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No saved trails yet.
                </div>
              ) : (
                recentSaved.map((s) => (
                  <Link
                    key={s.id}
                    href={`/trails/${s.trailId}`}
                    className="block rounded-xl border border-zinc-200 p-3 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  >
                    <div className="line-clamp-1 text-sm font-medium">{s.trail.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{s.trail.region}</span>
                      <span>•</span>
                      <span>{s.trail.distanceKm} km</span>
                      <span>•</span>
                      <span>{s.trail.difficulty}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 shadow-sm dark:border-zinc-800 dark:from-emerald-950/20 dark:to-cyan-950/10">
            <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Jump into the most common tasks
            </p>

            <div className="mt-4 grid gap-2">
              <Link
                href="/trails"
                className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                Explore trails
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                Set start location
              </Link>
              <Link
                href="/notifications"
                className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                Open notifications
              </Link>
              <Link
                href="/activity"
                className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
              >
                View activity log
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}