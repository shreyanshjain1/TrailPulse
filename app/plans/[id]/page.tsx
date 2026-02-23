import { auth } from "@/src/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarSyncButtons } from "@/src/components/calendar-sync-buttons";

export default async function PlanDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const plan = await prisma.hikePlan.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: { trail: true, checklist: true, calendarLink: true }
  });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm underline">← Dashboard</Link>
        <CalendarSyncButtons planId={plan.id} initialHasEvent={!!plan.calendarLink} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{plan.trail.name}</CardTitle>
          <CardDescription>{format(plan.startAt, "PPpp")} • {plan.durationMin} minutes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{plan.trail.region}</Badge>
            <Badge variant={plan.trail.difficulty === "HARD" ? "danger" : plan.trail.difficulty === "MODERATE" ? "warning" : "success"}>{plan.trail.difficulty}</Badge>
            <Badge>{plan.trail.distanceKm} km</Badge>
            <Badge>{plan.trail.elevationGainM} m</Badge>
          </div>

          {plan.notes ? (
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <div className="font-medium">Notes</div>
              <div className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{plan.notes}</div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div className="font-medium">Checklist</div>
            {plan.checklist.length === 0 ? (
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">No items.</div>
            ) : (
              <ul className="mt-2 space-y-2">
                {plan.checklist
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                      <span>{c.text}</span>
                      <Badge variant={c.isDone ? "success" : "default"}>{c.isDone ? "Done" : "Todo"}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
