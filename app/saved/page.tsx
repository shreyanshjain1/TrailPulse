import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { auth } from "@/src/auth";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const saved = await prisma.savedTrail.findMany({
    where: { userId: session.user.id },
    include: { trail: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-amber-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-amber-950/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Saved trails</h1>
            <p className="text-sm text-muted-foreground">
              Your shortlist for planning. Open a trail and hit Plan when ready.
            </p>
          </div>
          <Link href="/trails" className="text-sm font-medium underline">
            Explore trails →
          </Link>
        </div>
      </section>

      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <div className="text-base font-semibold">No saved trails yet</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Go to{" "}
            <Link className="underline" href="/trails">
              Trails
            </Link>{" "}
            and tap <b>Save</b>.
          </div>
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((s) => (
            <Link
              key={s.id}
              href={`/trails/${s.trailId}`}
              className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={
                    s.trail.imageUrl ||
                    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop"
                  }
                  alt={s.trail.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="line-clamp-1 text-lg font-semibold text-white">{s.trail.name}</h3>
                  <p className="line-clamp-1 text-xs text-white/85">{s.trail.region}</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">{s.trail.difficulty}</span>
                  <span className="rounded-full border px-2 py-0.5">{s.trail.distanceKm} km</span>
                  <span className="rounded-full border px-2 py-0.5">
                    {s.trail.elevationGainM} m gain
                  </span>
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {s.trail.shortDescription}
                </p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Saved {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Open →</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
