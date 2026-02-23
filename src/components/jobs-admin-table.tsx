"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

type JR = {
  id: string;
  queue: string;
  jobId: string;
  name: string;
  status: string;
  attempts: number;
  error: string | null;
  startedAt: string | Date;
  finishedAt: string | Date | null;
  createdAt: string | Date;
};

export function JobsAdminTable({ initial }: { initial: JR[] }) {
  const [items, setItems] = useState<JR[]>(initial);

  const failed = useMemo(() => items.filter((i) => i.status === "failed").length, [items]);

  async function retry(queue: string, jobId: string) {
    try {
      const res = await fetch("/api/jobs/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue, jobId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      toast.success("Retry triggered");
    } catch {
      toast.error("Network error");
    }
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">No job runs yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Failed runs: <span className="font-medium text-zinc-950 dark:text-zinc-50">{failed}</span>
      </div>
      <div className="space-y-2">
        {items.map((j) => (
          <div key={j.id} className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge>{j.queue}</Badge>
                <Badge variant={j.status === "failed" ? "danger" : j.status === "completed" ? "success" : "default"}>{j.status}</Badge>
                <span className="font-medium">{j.name}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">jobId: {j.jobId}</span>
              </div>
              <div className="flex items-center gap-2">
                {j.status === "failed" ? (
                  <Button size="sm" variant="secondary" onClick={() => retry(j.queue, j.jobId)}>
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Started: {format(new Date(j.startedAt), "PPpp")} {j.finishedAt ? `• Finished: ${format(new Date(j.finishedAt), "PPpp")}` : ""}
              {" • "}Attempts: {j.attempts}
            </div>
            {j.error ? (
              <pre className="mt-2 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {j.error}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
