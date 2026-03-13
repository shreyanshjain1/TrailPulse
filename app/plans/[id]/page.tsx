import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { PlanReadiness } from "@/src/components/plan-readiness";

function googleCalendarEventUrl(eventId: string) {
  return `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeURIComponent(eventId)}`;
}

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) redirect("/signin");

  const id = params?.id ? String(params.id) : "";
  if (!id) redirect("/plans");

  const plan = await prisma.hikePlan.findUnique({
    where: { id },
    include: {
      trail: true,
      checklist: { orderBy: { sortOrder: "asc" } },
      calendarLink: true,
    },
  });

  if (!plan) notFound();
  if (plan.userId !== user.id) redirect("/plans");

  const latestWeather = await prisma.weatherSnapshot.findFirst({
    where: { trailId: plan.trailId },
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true, payload: true },
  });

  const calendarEventId = plan.calendarLink?.eventId ?? null;
  const calendarEventUrl = calendarEventId ? googleCalendarEventUrl(calendarEventId) : null;

  const routeSections = ((plan.trail as any).routeSections as any[] | null | undefined) ?? [];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Plan</div>
          <h1 className="mt-1 text-2xl font-semibold">{plan.trail.name}</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            {new Date(plan.startAt).toLocaleString()} • {plan.durationMin} min • {plan.trail.distanceKm} km • {plan.trail.elevationGainM} m gain
          </div>
        </div>

        <div className="flex gap-2">
          <Link className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50" href="/plans">
            Back to Plans
          </Link>
          <Link className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50" href={`/trails/${plan.trailId}`}>
            View trail
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <PlanReadiness
          planId={plan.id}
          trailId={plan.trailId}
          trailName={plan.trail.name}
          startAt={plan.startAt.toISOString()}
          durationMin={plan.durationMin}
          calendarSynced={Boolean(plan.calendarLink)}
          checklist={plan.checklist.map((c) => ({ id: c.id, text: c.text, isDone: c.isDone }))}
          weatherFetchedAt={latestWeather?.fetchedAt?.toISOString() ?? null}
          weatherPayload={(latestWeather?.payload as any) ?? null}
          routeSections={routeSections}
        />
      </div>

      {calendarEventUrl ? (
        <div className="mt-8 rounded-2xl border bg-card p-5">
          <div className="text-sm font-semibold">Calendar</div>
          <div className="mt-2 text-sm text-muted-foreground">
            This plan is linked to Google Calendar.{" "}
            <a className="underline" href={calendarEventUrl} target="_blank" rel="noreferrer">
              Open event →
            </a>
          </div>
        </div>
      ) : null}

      <div className="mt-10 rounded-2xl border bg-card p-5">
        <div className="text-sm font-semibold">Notes</div>
        <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{plan.notes ? plan.notes : "No notes added."}</div>
      </div>
    </main>
  );
}