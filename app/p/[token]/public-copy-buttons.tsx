"use client";

import { toast } from "sonner";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PublicCopyButtons({
  trailName,
  startAt,
  durationMin,
  checklistDone,
  checklistTotal,
  weatherLine,
  shareUrl,
}: {
  trailName: string;
  startAt: string;
  durationMin: number;
  checklistDone: number;
  checklistTotal: number;
  weatherLine: string;
  shareUrl: string;
}) {
  async function copyLink() {
    const ok = await copyText(shareUrl);
    if (ok) toast.success("Public link copied");
    else toast.error("Copy failed");
  }

  async function copySummary() {
    const text = [
      "TrailPulse (Shared Plan)",
      `Trail: ${trailName}`,
      `Start: ${new Date(startAt).toLocaleString()}`,
      `Duration: ${durationMin} min`,
      `Checklist: ${checklistDone}/${checklistTotal} done`,
      weatherLine,
      `Link: ${shareUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const ok = await copyText(text);
    if (ok) toast.success("Plan summary copied");
    else toast.error("Copy failed");
  }

  return (
    <div className="grid gap-2">
      <button
        className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        onClick={copyLink}
      >
        Copy public link
      </button>

      <button
        className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        onClick={copySummary}
      >
        Copy plan summary
      </button>
    </div>
  );
}