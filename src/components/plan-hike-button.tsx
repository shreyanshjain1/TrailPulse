"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { CalendarPlus } from "lucide-react";

export function PlanHikeButton({ trailId, className }: { trailId: string; className?: string }) {
  return (
    <Button asChild className={className ?? ""}>
      <Link href={`/trails/${encodeURIComponent(trailId)}#plan`}>
        <CalendarPlus className="mr-2 h-4 w-4" />
        Plan hike
      </Link>
    </Button>
  );
}
