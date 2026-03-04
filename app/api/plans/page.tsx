import Link from "next/link";
import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { PlansList } from "@/src/components/plans-list";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const plans = await prisma.hikePlan.findMany({
    where: { userId: session.user.id },
    include: { trail: true, calendarLink: true, checklist: true },
    orderBy: { startAt: "asc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-teal-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-sky-950/10">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Your schedule — upcoming hikes first. Sync with Google Calendar when ready.
        </p>
      </section>

      <PlansList initial={plans as any} />
    </div>
  );
}
