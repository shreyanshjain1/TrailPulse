"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";

type PlanHikeButtonProps = {
  trailId: string;
  className?: string;
};

export function PlanHikeButton({ trailId, className }: PlanHikeButtonProps) {
  return (
    <Link
      href={`/plans/new?trailId=${encodeURIComponent(trailId)}`}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      }
    >
      <CalendarPlus className="h-4 w-4" />
      Plan Hike
    </Link>
  );
}