"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import { toast } from "sonner";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PlanHikeModal({ trailId, trailName }: { trailId: string; trailName: string }) {
  const router = useRouter();
  const initialStart = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    d.setMinutes(0, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState(initialStart);
  const [durationMin, setDurationMin] = useState("180");
  const [notes, setNotes] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [checklist, setChecklist] = useState<string[]>(["Water", "Snacks", "Headlamp"]);
  const [loading, setLoading] = useState(false);

  function addItem() {
    const t = checklistText.trim();
    if (!t) return;
    setChecklist((c) => [...c, t]);
    setChecklistText("");
  }

  function removeItem(i: number) {
    setChecklist((c) => c.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trailId,
          startAt: new Date(startAt).toISOString(),
          durationMin: Number(durationMin),
          notes: notes || undefined,
          checklist
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed");
        return;
      }
      toast.success("Hike plan created");
      setOpen(false);
      router.push(`/plans/${json.data.planId}`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline">
          <CalendarPlus className="h-4 w-4" />
          Plan hike
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plan hike</DialogTitle>
          <DialogDescription>Create a plan for: <span className="font-medium">{trailName}</span></DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Date & time</Label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input inputMode="numeric" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Meetup spot, pacing, reminders…" />
          </div>

          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Checklist item</Label>
                <Input value={checklistText} onChange={(e) => setChecklistText(e.target.value)} placeholder="e.g., Trekking poles" />
              </div>
              <Button type="button" variant="secondary" className="gap-2" onClick={addItem}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {checklist.length === 0 ? (
              <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">No checklist items yet.</div>
            ) : (
              <ul className="mt-3 space-y-2">
                {checklist.map((item, i) => (
                  <li key={`${item}-${i}`} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
                    <span>{item}</span>
                    <button
                      className="rounded-md p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                      onClick={() => removeItem(i)}
                      aria-label="Remove"
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="secondary" onClick={() => setOpen(false)} type="button">Cancel</Button>
          <Button onClick={submit} disabled={loading} type="button">Create plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
