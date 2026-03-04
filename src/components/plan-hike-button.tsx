"use client";

import { useRouter } from "next/navigation";

type Props = {
  trailId: string;
  trailName?: string;
  className?: string;
};

function cn(...arr: (string | undefined | false)[]) {
  return arr.filter(Boolean).join(" ");
}

export function PlanHikeButton({ trailId, className }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push(`/plans/new?trailId=${encodeURIComponent(trailId)}`);
      }}
      className={cn(
        "rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur transition hover:bg-white",
        "dark:bg-zinc-900/70 dark:text-zinc-100 dark:hover:bg-zinc-900",
        className
      )}
      title="Create a hike plan"
    >
      Plan hike
    </button>
  );
}