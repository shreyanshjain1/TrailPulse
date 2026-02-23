"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

type N = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string | Date;
};

export function NotificationsList({ initial }: { initial: N[] }) {
  const [items, setItems] = useState<N[]>(initial);

  const unread = useMemo(() => items.filter((i) => !i.isRead).length, [items]);

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      toast.error("Network error");
    }
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">No notifications yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Unread: <span className="font-medium text-zinc-950 dark:text-zinc-50">{unread}</span>
      </div>
      <div className="space-y-3">
        {items.map((n) => (
          <div key={n.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{n.title}</div>
                  {n.isRead ? <Badge>Read</Badge> : <Badge variant="warning">Unread</Badge>}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{format(new Date(n.createdAt), "PPpp")}</div>
              </div>
              {!n.isRead ? (
                <Button variant="secondary" size="sm" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              ) : null}
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{n.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
