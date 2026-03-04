"use client";

import Link from "next/link";

export function PlanCTA({ trailId }: { trailId: string }) {
  return (
    <Link
      href={`/plans/new?trailId=${encodeURIComponent(trailId)}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `/plans/new?trailId=${encodeURIComponent(trailId)}`;
      }}
      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
    >
      Plan
    </Link>
  );
}