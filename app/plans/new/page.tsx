import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { PlanBuilderForm } from "@/src/components/plan-builder-form";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams?: Promise<{ trailId?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/api/auth/signin");

  const sp = (await searchParams) ?? {};
  const trailId = sp.trailId ? String(sp.trailId) : "";

  if (!trailId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Create a plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a trail first, then create a hike plan.
          </p>
          <div className="mt-4">
            <Link href="/trails" className="underline">
              Go to Trails →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const trail = await prisma.trail.findUnique({
    where: { id: trailId },
    select: {
      id: true,
      name: true,
      region: true,
      difficulty: true,
      distanceKm: true,
      elevationGainM: true,
      lat: true,
      lng: true,
      imageUrl: true,
      shortDescription: true,
    },
  });

  if (!trail) notFound();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-amber-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-amber-950/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plan your hike</h1>
            <p className="text-sm text-muted-foreground">
              Smart duration + checklist templates + readiness score.
            </p>
          </div>
          <Link href={`/trails/${trail.id}`} className="text-sm font-medium underline">
            View trail →
          </Link>
        </div>
      </section>

      <PlanBuilderForm trail={trail as any} />
    </div>
  );
}