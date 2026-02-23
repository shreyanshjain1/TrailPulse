import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { JobsAdminTable } from "@/src/components/jobs-admin-table";
import { weatherSyncQueue, digestQueue } from "@/src/server/queues";

export default async function JobsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const runs = await prisma.jobRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const [weatherCounts, digestCounts] = await Promise.all([
    weatherSyncQueue.getJobCounts("waiting", "active", "failed", "completed", "delayed"),
    digestQueue.getJobCounts("waiting", "active", "failed", "completed", "delayed")
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">BullMQ visibility + retry controls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>weatherSync</CardTitle>
            <CardDescription>Trail conditions refresh</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <pre className="whitespace-pre-wrap">{JSON.stringify(weatherCounts, null, 2)}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>digest</CardTitle>
            <CardDescription>Daily recommendations</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <pre className="whitespace-pre-wrap">{JSON.stringify(digestCounts, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>From DB (worker writes JobRun rows)</CardDescription>
        </CardHeader>
        <CardContent>
          <JobsAdminTable initial={runs} />
        </CardContent>
      </Card>
    </div>
  );
}
