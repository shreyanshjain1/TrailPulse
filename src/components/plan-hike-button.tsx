"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { CalendarPlus } from "lucide-react";

export function PlanHikeButton({
  trailId,
  trailName,
}: {
  trailId: string;
  trailName?: string;
}) {
  return (
    <Button asChild className="gap-2">
      <Link href={`/plans/new?trailId=${encodeURIComponent(trailId)}`}>
        <CalendarPlus className="h-4 w-4" />
        Plan hike
      </Link>
    </Button>
  );
}