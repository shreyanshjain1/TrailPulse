import { auth } from "@/src/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import Link from "next/link";
import { SaveTrailButton } from "@/src/components/save-trail-button";
import { PlanHikeModal } from "@/src/components/plan-hike-modal";
import { formatDistanceToNow } from "date-fns";

export default async function TrailDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const trail = await prisma.trail.findUnique({ where: { id: params.id } });
  if (!trail) notFound();

  const saved = await prisma.savedTrail.findFirst({
    where: { userId: session.user.id, trailId: trail.id },
    select: { id: true }
  });

  const latestWeather = await prisma.weatherSnapshot.findFirst({
    where: { trailId: trail.id },
    orderBy: { fetchedAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/trails" className="text-sm underline">← Back to trails</Link>
        <div className="flex gap-2">
          <SaveTrailButton trailId={trail.id} initialSaved={!!saved} />
          <PlanHikeModal trailId={trail.id} trailName={trail.name} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{trail.name}</CardTitle>
          <CardDescription>{trail.shortDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{trail.region}</Badge>
            <Badge variant={trail.difficulty === "HARD" ? "danger" : trail.difficulty === "MODERATE" ? "warning" : "success"}>{trail.difficulty}</Badge>
            <Badge>{trail.distanceKm} km</Badge>
            <Badge>{trail.elevationGainM} m gain</Badge>
            <Badge>({trail.lat}, {trail.lng})</Badge>
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <div className="font-medium">Latest conditions</div>
            {latestWeather ? (
              <div className="mt-2 text-zinc-700 dark:text-zinc-300">
                <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(latestWeather.payload, null, 2)}</pre>
                <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Updated {formatDistanceToNow(latestWeather.fetchedAt, { addSuffix: true })}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">
                No weather snapshot yet. The background job will fetch it after you save or plan this trail.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
