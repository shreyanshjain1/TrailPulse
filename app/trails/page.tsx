import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listTrails, trailFiltersSchema } from "@/src/server/trails";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { TrailsFilters } from "@/src/components/trails-filters";

export default async function TrailsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const trails = await listTrails(searchParams);

  const saved = await prisma.savedTrail.findMany({
    where: { userId: session.user.id, trailId: { in: trails.map((t) => t.id) } },
    select: { trailId: true }
  });
  const savedSet = new Set(saved.map((s) => s.trailId));

  const parsed = trailFiltersSchema.safeParse(searchParams);
  const current = parsed.success ? parsed.data : {};

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trails</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Discover trails, save favorites, and plan hikes.</p>
        </div>
        <Link href="/dashboard" className="text-sm underline">Dashboard</Link>
      </div>

      <TrailsFilters initial={current} />

      {trails.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No trails found</CardTitle>
            <CardDescription>Try adjusting your filters or search query.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trails.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-1">{t.name}</CardTitle>
                <CardDescription className="line-clamp-2">{t.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge>{t.region}</Badge>
                  <Badge variant={t.difficulty === "HARD" ? "danger" : t.difficulty === "MODERATE" ? "warning" : "success"}>{t.difficulty}</Badge>
                  <Badge>{t.distanceKm} km</Badge>
                  <Badge>{t.elevationGainM} m</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Link href={`/trails/${t.id}`} className="text-sm underline">View details</Link>
                  {savedSet.has(t.id) ? <Badge variant="success">Saved</Badge> : <Badge>Not saved</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
