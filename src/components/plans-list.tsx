"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";

type Plan = {
  id: string;
  trailId: string;
  startAt: string | Date;
  durationMin: number;
  notes: string | null;
  calendarLink?: { id: string; eventId: string } | null;
  trail: {
    name: string;
    region: string;
    difficulty: string;
    distanceKm: number;
    elevationGainM: number;
    imageUrl: string | null;
    shortDescription: string;
  };
};

function isPast(d: Date) {
  return d.getTime() < Date.now() - 30 * 60 * 1000;
}

export function PlansList({ initial }: { initial: Plan[] }) {
  const [items, setItems] = useState<Plan[]>(initial);

  const { upcoming, past } = useMemo(() => {
    const up: Plan[] = [];
    const pa: Plan[] = [];
    for (const p of items) {
      const d = new Date(p.startAt);
      if (isPast(d)) pa.push(p);
      else up.push(p);
    }
    return { upcoming: up, past: pa.reverse() };
  }, [items]);

  async function deletePlan(planId: string) {
    const ok = confirm("Delete this plan?");
    if (!ok) return;

    try {
      const res = await fetch("/api/plans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== planId));
      toast.success("Plan deleted");
    } catch {
      toast.error("Network error");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <div className="text-base font-semibold">No plans yet</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Go to{" "}
          <Link className="underline" href="/trails">
            Trails
          </Link>{" "}
          and click <b>Plan hike</b>.
        </div>
      </div>
    );
  }

  const Section = ({ title, list }: { title: string; list: Plan[] }) => (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{list.length} item(s)</p>
        </div>
        <Link href="/trails" className="text-sm font-medium underline">
          Explore trails
        </Link>
      </div>

      <div className="space-y-3">
        {list.map((p) => (
          <div key={p.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/plans/${p.id}`} className="text-base font-semibold hover:underline">
                    {p.trail.name}
                  </Link>
                  <Badge variant="secondary">{p.trail.difficulty}</Badge>
                  {p.calendarLink ? (
                    <Badge className="bg-emerald-600 text-white">Calendar synced</Badge>
                  ) : null}
                </div>

                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(p.startAt).toLocaleString()} • {p.durationMin} min
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{p.trail.region}</Badge>
                  <Badge variant="secondary">{p.trail.distanceKm} km</Badge>
                  <Badge variant="secondary">{p.trail.elevationGainM} m gain</Badge>
                </div>

                {p.notes ? (
                  <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.notes}</div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/plans/${p.id}`}>Open plan</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/trails/${p.trailId}`}>Open trail</Link>
                </Button>
                <Button variant="destructive" onClick={() => deletePlan(p.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="space-y-8">
      <Section title="Upcoming" list={upcoming} />
      <Section title="Past" list={past} />
    </div>
  );
}
