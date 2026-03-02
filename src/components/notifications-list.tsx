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

function dayKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function NotificationsList({ initial }: { initial: N[] }) {
  const [items, setItems] = useState<N[]>(initial);

  const unread = useMemo(() => items.filter((i) => !i.isRead).length, [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, N[]>();
    for (const n of items) {
      const d = new Date(n.createdAt);
      const key = dayKey(d);
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    // newest groups first
    const sortedKeys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
    return sortedKeys.map((k) => ({
      key: k,
      label: format(new Date(k), "PPPP"),
      items: map.get(k)!,
    }));
  }, [items]);

  async function markRead(id: string) {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
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

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Network error");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold">Inbox</div>
          <Badge variant="secondary">Unread: {unread}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={markAllRead} disabled={unread === 0}>
            Mark all read
          </Button>
        </div>
      </div>

      {/* Groups */}
      {grouped.map((g) => (
        <div key={g.key} className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{g.label}</div>

          <div className="space-y-2">
            {g.items.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border bg-card p-4 transition hover:shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                      {n.isRead ? (
                        <Badge variant="secondary">Read</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white">New</Badge>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(n.createdAt), "PPpp")}
                    </div>
                  </div>

                  {!n.isRead ? (
                    <Button variant="outline" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>

                <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {n.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}