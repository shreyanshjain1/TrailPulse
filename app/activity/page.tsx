import { auth } from "@/src/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/src/server/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/src/components/ui/badge";

export default async function ActivityPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const logs = await prisma.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Security-audit friendly record of key actions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>Last 100 events</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">No activity yet.</div>
          ) : (
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Badge>{l.action}</Badge>
                    <span className="text-zinc-700 dark:text-zinc-300">{l.target ?? "-"}</span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{format(l.createdAt, "PPpp")}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
