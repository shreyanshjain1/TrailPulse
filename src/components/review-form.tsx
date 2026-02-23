"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";

export function ReviewForm({ trailId }: { trailId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Rating</label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            <option value={5}>5 - Amazing</option>
            <option value={4}>4 - Great</option>
            <option value={3}>3 - Good</option>
            <option value={2}>2 - Meh</option>
            <option value={1}>1 - Bad</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Comment (optional)</label>
          <input
            placeholder="What was it like?"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
          />
        </div>
      </div>

      <Button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trailId, rating, comment }),
            });
            window.location.reload();
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Posting..." : "Post review"}
      </Button>
    </div>
  );
}