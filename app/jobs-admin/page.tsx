import { redirect } from "next/navigation";
import { auth } from "@/src/auth";
import { prisma } from "@/src/server/prisma";

export default async function JobsAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  // Optional: only admin can see this
  // if (session.user.role !== "ADMIN") redirect("/dashboard");

  const runs = await prisma.jobRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-gradient-to-r from-emerald-100/70 via-cyan-50 to-sky-50 p-6 dark:from-emerald-950/20 dark:via-cyan-950/10 dark:to-sky-950/10">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs Admin</h1>
        <p className="text-sm text-muted-foreground">
          Recent worker runs (success/fail) with attempts and errors.
        </p>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        {runs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No job runs yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Queue</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Attempts</th>
                  <th className="py-2 pr-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{r.queue}</td>
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          r.status === "failed"
                            ? "rounded-full bg-rose-500/15 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300"
                            : "rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{r.attempts}</td>
                    <td className="py-2 pr-4">
                      <div className="max-w-[560px] truncate text-xs text-muted-foreground">
                        {r.error ?? ""}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}