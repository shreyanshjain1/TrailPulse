// app/trails/[id]/page.tsx
import { prisma } from "@/src/server/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SaveTrailButton } from "@/src/components/save-trail-button";
import { PlanHikeModal } from "@/src/components/plan-hike-modal";
import { WeatherCard } from "@/src/components/weather-card";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { auth } from "@/src/auth";
import { ReviewForm } from "@/src/components/review-form";

function stars(avg: number) {
  const full = Math.round(avg);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

export default async function TrailDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/signin");

  const trail = await prisma.trail.findUnique({
    where: { id: params.id },
    include: {
      weatherSnapshots: { orderBy: { fetchedAt: "desc" }, take: 1 },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { name: true, image: true } } },
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!trail) return notFound();

  const agg = await prisma.review.aggregate({
    where: { trailId: trail.id },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avg = agg._avg.rating ?? 0;
  const count = agg._count.rating ?? 0;

  const latest = trail.weatherSnapshots[0]
    ? { fetchedAt: trail.weatherSnapshots[0].fetchedAt, payload: trail.weatherSnapshots[0].payload }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/trails" className="text-sm text-muted-foreground hover:underline">
          ← Back to trails
        </Link>

        <div className="flex gap-2">
          <SaveTrailButton trailId={trail.id} />
          <PlanHikeModal trailId={trail.id} trailName={trail.name} />
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border">
        <div className="h-[220px] w-full bg-cover bg-center" style={{ backgroundImage: `url(${trail.imageUrl})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-2xl font-semibold tracking-tight">{trail.name}</div>
              <div className="text-sm text-muted-foreground">{trail.shortDescription}</div>
            </div>

            <div className="rounded-xl border bg-background/80 px-4 py-2">
              <div className="text-xs text-muted-foreground">Rating</div>
              <div className="text-sm font-semibold">
                {count ? `${avg.toFixed(1)} / 5` : "No ratings yet"}{" "}
                <span className="ml-2 font-normal text-muted-foreground">{count ? stars(avg) : ""}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{trail.region}</Badge>
            <Badge variant="outline">{trail.difficulty}</Badge>
            <Badge variant="outline">{trail.distanceKm} km</Badge>
            <Badge variant="outline">{trail.elevationGainM} m gain</Badge>
            <Badge variant="outline">
              ({trail.lat.toFixed(5)}, {trail.lng.toFixed(5)})
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Reviews */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Reviews</div>
                  <div className="text-sm text-muted-foreground">
                    {count ? `${count} rating(s) • avg ${avg.toFixed(1)}` : "Be the first to review this trail"}
                  </div>
                </div>
              </div>

              {/* Add review (client-side fetch) */}
              <ReviewForm trailId={trail.id} />

              {/* Reviews list */}
              {trail.reviews.length === 0 ? (
                <div className="text-sm text-muted-foreground">No reviews yet.</div>
              ) : (
                <div className="space-y-3">
                  {trail.reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{r.user?.name ?? "Anonymous"}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.rating}/5 <span className="ml-2">{stars(r.rating)}</span>
                        </div>
                      </div>
                      {r.comment ? <div className="mt-2 text-sm">{r.comment}</div> : null}
                      <div className="mt-2 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weather */}
        <div className="space-y-6">
          <WeatherCard snapshot={latest} />
        </div>
      </div>
    </div>
  );
}