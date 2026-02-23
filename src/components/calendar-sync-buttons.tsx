"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { CalendarPlus, CalendarX } from "lucide-react";
import { useRouter } from "next/navigation";

export function CalendarSyncButtons({ planId, initialHasEvent }: { planId: string; initialHasEvent: boolean }) {
  const [hasEvent, setHasEvent] = useState(initialHasEvent);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function add() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setHasEvent(true);
      toast.success("Added to Google Calendar");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/create", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setHasEvent(false);
      toast.success("Removed from Google Calendar");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return hasEvent ? (
    <Button variant="secondary" className="gap-2" onClick={remove} disabled={loading}>
      <CalendarX className="h-4 w-4" />
      Remove from Calendar
    </Button>
  ) : (
    <Button className="gap-2" onClick={add} disabled={loading}>
      <CalendarPlus className="h-4 w-4" />
      Add to Google Calendar
    </Button>
  );
}
