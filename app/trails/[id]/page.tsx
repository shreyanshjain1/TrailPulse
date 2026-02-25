import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { SaveTrailButton } from "@/src/components/save-trail-button";
import { PlanHikeButton } from "@/src/components/plan-hike-button";
import TrailMap from "@/src/components/trail-map";

async function postReview(formData: FormData) {
  "use server";

  const user = await requireUser();
  if (!user) {
    redirect("/api/auth/signin");
  }

  const trailId = String(formData.get("trailId") ?? "");
  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();

  if (!trailId || !rating || rating < 1 || rating > 5) return;

  await prisma.review.create({
    data: {
      trailId,
      userId: user.id,
      rating,
      comment: comment || null,
    },
  });
}

type RouteSection = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  type?: string;
  note?: string;
};

type GeoJsonLineFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  properties?: Record<string, unknown>;
};

function getDifficultyBadgeClasses(difficulty: string) {
  switch (difficulty) {
    case "EASY":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "MODERATE":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    case "HARD":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300";
  }
}

export default async function TrailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const { id } = await params;

  const trail = await prisma.trail.findUnique({
    where: { id },
    include: {
      weatherSnapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
      reviews: {
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!trail) notFound();

  const avgRating =
    trail.reviews.length > 0
      ? (
          trail.reviews.reduce((sum, r) => sum + r.rating, 0) / trail.reviews.length
        ).toFixed(1)
      : null;

  const latest = (trail.weatherSnapshots[0]?.payload as any) || undefined;
  const temp = latest?.temperature_c ?? latest?.raw?.current?.temperature_2m ?? null;
  const wind = latest?.wind_kph ?? latest?.raw?.current?.wind_speed_10m ?? null;
  const rain =
    latest?.precipitation_chance ??
    latest?.raw?.hourly?.precipitation_probability?.[0] ??
    null;

  const heroImage =
    trail.imageUrl ||
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1600&auto=format&fit=crop";

  // Prisma JSON fields (safe-cast)
  const routeGeoJson = (trail as any).routeGeoJson as GeoJsonLineFeature | null | undefined;
  const routeSections = ((trail as any).routeSections as RouteSection[] | null | undefined) ?? [];

  const hasRouteLine =
    routeGeoJson?.type === "Feature" &&
    routeGeoJson?.geometry?.type === "LineString" &&
    Array.isArray(routeGeoJson?.geometry?.coordinates) &&
    routeGeoJson.geometry.coordinates.length > 1;

  const trailBreakdown =
    routeSections.length > 0
      ? routeSections.map((s, idx) => ({
          title: s.label,
          body:
            s.note ||
            (idx === 0
              ? "Trailhead section. Set your pace and check your essentials before climbing."
              : idx === routeSections.length - 1
              ? "Final section / viewpoint area. Terrain can be exposed and windy."
              : "Intermediate section of the trail route."),
        }))
      : [
          {
            title: "Warm-up section",
            body: "Expect an easier opening stretch. Start steady and don’t burn your legs too early.",
          },
          {
            title: "Main climb",
            body: "This is the toughest section with sustained elevation gain. Use shorter strides and keep water accessible.",
          },
          {
            title: "Exposed ridge / open areas",
            body: "Wind and sun exposure usually increase here. Bring sun protection and a light shell.",
          },
          {
            title: "Viewpoint / summit push",
            body: "Final section often rewards you with the best views. Slow down and enjoy the terrain.",
          },
        ];

  const checklist = [
    "1–2L water minimum",
    "Trail shoes / grip",
    "Cap + sun protection",
    "Light rain layer",
    "Power bank + flashlight",
    "Small first aid kit",
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-4 md:px-6">
      <div className="flex items-center justify-between">
        <Link
          href="/trails"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← Back to trails
        </Link>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-900 dark:border-zinc-800">
        <div className="relative h-[320px] md:h-[380px]">
          <img src={heroImage} alt={trail.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          <div className="absolute right-4 top-4 flex items-center gap-2">
            <SaveTrailButton trailId={trail.id} />
            <PlanHikeButton trailId={trail.id} trailName={trail.name} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {[trail.region, trail.difficulty, `${trail.distanceKm} km`, `${trail.elevationGainM} m gain`].map(
                (pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur"
                  >
                    {pill}
                  </span>
                )
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {trail.name}
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-white/85 md:text-base">
              {trail.shortDescription}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/85">
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                {avgRating
                  ? `⭐ ${avgRating} (${trail.reviews.length} review${
                      trail.reviews.length > 1 ? "s" : ""
                    })`
                  : "No ratings yet"}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">
                {trail.lat.toFixed(5)}, {trail.lng.toFixed(5)}
              </span>
              {hasRouteLine ? (
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-100">
                  Route line available
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT */}
        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Trail breakdown</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  What to expect on this route
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {trailBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Trail map</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Interactive map with route line and labeled sections
              </p>
            </div>

            <TrailMap
              lat={trail.lat}
              lng={trail.lng}
              name={trail.name}
              routeGeoJson={routeGeoJson ?? null}
              routeSections={routeSections}
            />

            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {hasRouteLine ? (
                <>
                  Showing seeded route polyline + section markers. Next upgrade: import real GPX/GeoJSON
                  per trail from official hiking sources / community tracks.
                </>
              ) : (
                <>
                  No route line yet for this trail. The map is still centered to the trail coordinates.
                </>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Share your experience and help others plan better
              </p>
            </div>

            <form
              action={postReview}
              className="mb-4 grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[180px_1fr_auto] dark:border-zinc-800 dark:bg-zinc-950"
            >
              <input type="hidden" name="trailId" value={trail.id} />

              <select
                name="rating"
                defaultValue="5"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/20 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="5">5 - Amazing</option>
                <option value="4">4 - Great</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Tough / Okay</option>
                <option value="1">1 - Poor</option>
              </select>

              <input
                name="comment"
                placeholder="What was it like?"
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/20 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-900"
              />

              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Post review
              </button>
            </form>

            <div className="space-y-3">
              {trail.reviews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  No reviews yet. Be the first to review this trail.
                </div>
              ) : (
                trail.reviews.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {r.user.image ? (
                          <img
                            src={r.user.image}
                            alt={r.user.name ?? "User"}
                            className="h-8 w-8 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{r.user.name ?? "User"}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(r.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {"⭐".repeat(r.rating)} {r.rating}/5
                      </div>
                    </div>

                    {r.comment ? (
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{r.comment}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Latest conditions</h2>

            {latest ? (
              <>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {latest.summary ?? "Forecast snapshot"}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="text-xs text-zinc-500">Temp</div>
                    <div className="text-sm font-semibold">
                      {temp != null ? `${Number(temp).toFixed(1)}°C` : "-"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="text-xs text-zinc-500">Wind</div>
                    <div className="text-sm font-semibold">
                      {wind != null ? `${Math.round(Number(wind))} kph` : "-"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="text-xs text-zinc-500">Rain</div>
                    <div className="text-sm font-semibold">
                      {rain != null ? `${Math.round(Number(rain))}%` : "-"}
                    </div>
                  </div>
                </div>

                <details className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <summary className="cursor-pointer text-sm font-medium">
                    View raw weather snapshot
                  </summary>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-zinc-100 p-2 text-xs dark:bg-zinc-950">
                    {JSON.stringify(latest, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No weather snapshot yet. Save or plan this trail, then run the worker to fetch weather.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Hike checklist</h2>
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Route sections</h2>

            {routeSections.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                No route section labels yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {routeSections.map((s, idx) => (
                  <div
                    key={s.id ?? `${s.label}-${idx}`}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{s.label}</div>
                      {s.type ? (
                        <span className="rounded-full px-2 py-0.5 text-xs capitalize bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {s.type}
                        </span>
                      ) : null}
                    </div>
                    {s.note ? (
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.note}</div>
                    ) : null}
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 shadow-sm dark:border-zinc-800 dark:from-emerald-950/20 dark:to-cyan-950/10">
            <h2 className="text-lg font-semibold">Trail summary</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-zinc-500">Region</span>
                <span className="font-medium">{trail.region}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-zinc-500">Difficulty</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getDifficultyBadgeClasses(
                    trail.difficulty
                  )}`}
                >
                  {trail.difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-zinc-500">Distance</span>
                <span className="font-medium">{trail.distanceKm} km</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-zinc-500">Elevation gain</span>
                <span className="font-medium">{trail.elevationGainM} m</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/60 bg-white/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                <span className="text-zinc-500">Coordinates</span>
                <span className="font-medium">
                  {trail.lat.toFixed(3)}, {trail.lng.toFixed(3)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}