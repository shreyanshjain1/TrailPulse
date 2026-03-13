import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import TrailCompare from "@/src/components/trail-compare";

export default async function ComparePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Compare Trails</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick 2–3 trails and compare distance, elevation, difficulty, and latest weather snapshot.
      </p>
      <div className="mt-6">
        <TrailCompare />
      </div>
    </main>
  );
}