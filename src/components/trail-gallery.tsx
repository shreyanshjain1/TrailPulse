"use client";

import { useMemo, useState } from "react";

export type TrailPhoto = {
  url: string;
  title: string;
  pageUrl: string;
  credit: string;
};

function cn(...arr: (string | undefined | false)[]) {
  return arr.filter(Boolean).join(" ");
}

export function TrailGallery({ photos }: { photos: TrailPhoto[] }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const has = photos && photos.length > 0;

  const current = useMemo(() => (has ? photos[idx] : null), [has, photos, idx]);

  function prev() {
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  }
  function next() {
    setIdx((i) => (i + 1) % photos.length);
  }

  if (!has) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
        No gallery photos yet for this trail.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p, i) => (
          <button
            key={p.title}
            onClick={() => {
              setIdx(i);
              setOpen(true);
            }}
            className="group relative overflow-hidden rounded-2xl border bg-card"
            type="button"
          >
            <img
              src={p.url}
              alt={p.title}
              className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-70" />
            <div className="absolute bottom-2 left-2 right-2 text-left text-[11px] text-white/90">
              <div className="line-clamp-1 font-semibold">Photo</div>
              <div className="line-clamp-1 text-white/75">Tap to view</div>
            </div>
          </button>
        ))}
      </div>

      {open && current ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border bg-black">
            <img src={current.url} alt={current.title} className="max-h-[80vh] w-full object-contain" />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-white/85">
                  <a
                    href={current.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    View on Wikimedia Commons
                  </a>
                  <span className="ml-2 text-white/60">{current.credit}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    Prev
                  </button>
                  <button
                    onClick={next}
                    className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
              {idx + 1}/{photos.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}