import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { auth } from "@/src/auth";
import { PlansList } from "@/src/components/plans-list";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const plans = await prisma.hikePlan.findMany({
    where: { userId: session.user.id },
    include: {
      trail: true,
      calendarLink: true,
    },
    orderBy: { startAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
            <p className="text-sm text-muted-foreground">
              View upcoming + past hikes. Open a plan to see readiness, checklist, and timeline.
            </p>
          </div>
          <Link href="/trails" className="text-sm font-medium underline">
            Plan another →
          </Link>
        </div>
      </section>

      <PlansList initial={plans as any} />
    </div>
  );
}