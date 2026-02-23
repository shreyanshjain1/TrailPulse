// app/trails/page.tsx
import { listTrails } from "@/src/server/trails";
import { AppShell } from "@/src/components/app-shell";
import { TrailsFilters } from "@/src/components/trails-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Link from "next/link";

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function TrailsPage({
  searchParams,
}: {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp = await Promise.resolve(searchParams);

  const initial = {
    q: first(sp.q) ?? "",
    difficulty: first(sp.difficulty) ?? "",
    minDistance: sp.minDistance ? Number(first(sp.minDistance)) : undefined,
    maxDistance: sp.maxDistance ? Number(first(sp.maxDistance)) : undefined,
    minElevation: sp.minElevation ? Number(first(sp.minElevation)) : undefined,
    maxElevation: sp.maxElevation ? Number(first(sp.maxElevation)) : undefined,
  };

  const trails = await listTrails(sp);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trails</h1>
          <p className="text-sm text-muted-foreground">Search and filter the seeded catalog.</p>
        </div>

        <TrailsFilters initial={initial} />

        {trails.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No trails found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Try changing filters or removing the search term.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trails.map((t) => (
              <Link key={t.id} href={`/trails/${t.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">{t.region}</div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border px-2 py-0.5">{t.difficulty}</span>
                      <span className="rounded-full border px-2 py-0.5">{t.distanceKm} km</span>
                      <span className="rounded-full border px-2 py-0.5">{t.elevationGainM} m gain</span>
                    </div>
                    <p className="line-clamp-3 text-muted-foreground">{t.shortDescription}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}