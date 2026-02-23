"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function SaveTrailButton({ trailId, initialSaved }: { trailId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/trails/save", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trailId })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      setSaved(!saved);
      toast.success(!saved ? "Saved to Planned" : "Removed from Planned");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant={saved ? "secondary" : "default"} onClick={toggle} disabled={loading} className="gap-2">
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
