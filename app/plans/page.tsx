import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";

export default async function PlansPage() {
  const user = await requireUser();
  if (!user) redirect("/signin");

  const plans = await prisma.hikePlan.findMany({
    where: { userId: user.id },
    orderBy: { startAt: "desc" },
    take: 200,
    include: {
      trail: {
        select: {
          id: true,
          name: true,
          region: true,
          difficulty: true,
          distanceKm: true,
          elevationGainM: true,
          imageUrl: true,
        },
      },
      checklist: { select: { isDone: true } },
      calendarLink: { select: { eventId: true } }, // ✅ your schema has eventId
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your upcoming and past hikes.</p>
        </div>
        <Link
          href="/trails"
          className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          Browse trails →
        </Link>
      </div>

      {plans.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <div className="text-lg font-semibold">No plans yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Create your first plan from a trail page. We’ll generate a checklist and keep weather & calendar in sync.
          </div>
          <div className="mt-4">
            <Link
              href="/trails"
              className="inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Create your first plan
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-3">
          {plans.map((p) => {
            const total = p.checklist.length;
            const done = p.checklist.filter((c) => c.isDone).length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const hasCalendar = Boolean(p.calendarLink?.eventId);

            return (
              <Link
                key={p.id}
                href={`/plans/${p.id}`}
                className="group rounded-2xl border bg-card p-5 transition hover:bg-muted/20"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Trail</div>
                    <div className="mt-1 text-base font-semibold group-hover:underline">{p.trail.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {p.trail.region} • {p.trail.distanceKm} km • {p.trail.elevationGainM} m gain
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {new Date(p.startAt).toLocaleString()} • {p.durationMin} min
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-2 sm:mt-0">
                    <span className="rounded-full border px-2.5 py-1 text-xs font-medium">{p.trail.difficulty}</span>
                    <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Checklist {pct}%</span>
                    {hasCalendar ? (
                      <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Calendar ✓</span>
                    ) : (
                      <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">Calendar –</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}