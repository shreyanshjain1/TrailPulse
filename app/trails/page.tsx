import Link from "next/link";
import { requireUser } from "@/src/server/authz";
import { listTrails } from "@/src/server/trails";
import { TrailsFilters } from "@/src/components/trails-filters";
import { PlanCTA } from "@/src/components/plan-cta";

type SearchParams = {
  q?: string;
  difficulty?: string;
  minDistanceKm?: string;
  maxDistanceKm?: string;
  minElevationGainM?: string;
  maxElevationGainM?: string;
};

export default async function TrailsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};

  const { trails, homeLocation } = await listTrails({
    raw: params ?? {},
    userId: user?.id ?? null,
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-amber-50 p-6 dark:from-emerald-950/30 dark:via-cyan-950/10 dark:to-amber-950/10">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#10b981_0,transparent_40%),radial-gradient(circle_at_80%_10%,#06b6d4_0,transparent_35%),radial-gradient(circle_at_70%_80%,#f59e0b_0,transparent_30%)]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold tracking-tight">Explore trails</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter routes, compare difficulty, and plan your next hike.
          </p>

          {homeLocation ? (
            <div className="mt-3 inline-flex items-center rounded-full border bg-background/80 px-3 py-1 text-xs">
              Nearby sorting from: <span className="ml-1 font-medium">{homeLocation.label}</span>
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">
              Want nearby trails?{" "}
              <Link href="/profile" className="underline">
                Add your start location in Profile
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      <TrailsFilters initial={params ?? {}} />

      {/* Grid */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {trails.map((trail) => {
          const detailHref = `/trails/${trail.id}`;
          const img =
            trail.imageUrl ||
            `https://source.unsplash.com/1200x800/?mountain,hiking,trail&sig=${trail.id}`;

          return (
            <div
              key={trail.id}
              className="group relative overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              {/* clickable image/title area */}
              <Link href={detailHref} className="block">
                <div className="relative h-44 w-full overflow-hidden">
                  <img
                    src={img}
                    alt={trail.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="line-clamp-1 text-lg font-semibold text-white">
                      {trail.name}
                    </h3>
                    <p className="line-clamp-1 text-xs text-white/85">{trail.region}</p>
                  </div>
                </div>
              </Link>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">{trail.difficulty}</span>
                  <span className="rounded-full border px-2 py-0.5">{trail.distanceKm} km</span>
                  <span className="rounded-full border px-2 py-0.5">
                    {trail.elevationGainM} m gain
                  </span>
                  {trail.distanceFromStartKm != null ? (
                    <span className="rounded-full border bg-emerald-50 px-2 py-0.5 dark:bg-emerald-950/30">
                      {trail.distanceFromStartKm.toFixed(1)} km away
                    </span>
                  ) : null}

                  <div className="ml-auto">
                    <PlanCTA trailId={trail.id} />
                  </div>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {trail.shortDescription ?? trail.summary}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <div className="text-muted-foreground">
                    {trail.avgRating ? `⭐ ${trail.avgRating} (${trail.reviewCount})` : "No ratings yet"}
                  </div>
                  <Link
                    href={detailHref}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    View trail →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}