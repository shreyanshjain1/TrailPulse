export default function LoadingTrails() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="h-5 w-2/3 rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
            <div className="mt-3 h-4 w-full rounded bg-zinc-200/60 dark:bg-zinc-800/60" />
            <div className="mt-2 h-4 w-5/6 rounded bg-zinc-200/60 dark:bg-zinc-800/60" />
            <div className="mt-6 flex gap-2">
              <div className="h-5 w-16 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60" />
              <div className="h-5 w-16 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60" />
              <div className="h-5 w-16 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
