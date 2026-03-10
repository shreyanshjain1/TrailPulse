import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { PlanBuilderForm } from "@/src/components/plan-builder-form";

export default async function NewPlanPage({
  searchParams,
}: {
  // Next 15: treat searchParams as async to avoid sync-dynamic-apis warnings
  searchParams?: Promise<{ trailId?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/signin");

  const sp = (await searchParams) ?? {};
  const trailId = sp.trailId ? String(sp.trailId) : "";

  if (!trailId) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Create a plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pick a trail first, then create a hike plan.</p>

        <div className="mt-6">
          <Link
            href="/trails"
            className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            Go to Trails →
          </Link>
        </div>
      </main>
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
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plan your hike</h1>
          <p className="mt-1 text-sm text-muted-foreground">Smart duration + checklist templates + readiness score.</p>
        </div>
        <Link
          href={`/trails/${trail.id}`}
          className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          View trail →
        </Link>
      </div>

      <div className="mt-8">
        <PlanBuilderForm trail={trail} />
      </div>
    </main>
  );
}