import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/src/auth";

function Feature({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-base font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-amber-50 p-8 dark:from-emerald-950/30 dark:via-cyan-950/10 dark:to-amber-950/10">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_15%_20%,#10b981_0,transparent_40%),radial-gradient(circle_at_85%_10%,#06b6d4_0,transparent_35%),radial-gradient(circle_at_70%_80%,#f59e0b_0,transparent_30%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
            <span className="font-semibold">TrailPulse</span>
            <span className="text-muted-foreground">Hike • Plan • Sync</span>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            Plan hikes like a pro — with readiness, weather, and calendar sync.
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Browse trails, save favorites, build smart hike plans with checklist templates,
            get a readiness score, and add events to Google Calendar.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Sign in with Google
            </Link>

            <Link
              href="/trails"
              className="rounded-xl border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted/40"
            >
              Explore trails (demo)
            </Link>

            <Link
              href="https://github.com/shreyanshjain1/TrailPulse"
              className="rounded-xl border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-muted/40"
            >
              View GitHub
            </Link>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Note: Calendar events are created only when you click “Add to Google Calendar”.
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">What you can do</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Practical planning features — not just UI.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="Trail discovery"
            desc="Search & filter by difficulty, distance, elevation. Save trails you want to hike."
          />
          <Feature
            title="Smart plan builder"
            desc="Suggested duration, water/snack estimate, and checklist templates."
          />
          <Feature
            title="Readiness score"
            desc="Checklist completion + weather freshness + calendar sync signals."
          />
          <Feature
            title="Weather GO/WATCH/RISK"
            desc="Quick interpretation of weather snapshots so you can decide faster."
          />
          <Feature
            title="Packing mode"
            desc="Full-screen big-tap checklist for actual pre-hike packing."
          />
          <Feature
            title="Google Calendar sync"
            desc="Create a calendar event for your plan with one click."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-3xl border bg-card p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Ready to try it?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to start saving trails and creating real plans.
            </p>
          </div>
          <Link
            href="/signin"
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Go to Login →
          </Link>
        </div>
      </section>
    </div>
  );
}