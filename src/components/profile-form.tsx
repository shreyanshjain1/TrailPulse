"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";

type Initial = {
  name: string;
  email: string;
  image: string;
  homeLabel: string;
  homeLat: number | null;
  homeLng: number | null;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const [homeLabel, setHomeLabel] = useState(initial.homeLabel);
  const [homeLat, setHomeLat] = useState(initial.homeLat?.toString() ?? "");
  const [homeLng, setHomeLng] = useState(initial.homeLng?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeLabel: homeLabel.trim() || null,
          homeLat: homeLat.trim() ? Number(homeLat) : null,
          homeLng: homeLng.trim() ? Number(homeLng) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error ?? "Failed to save");
        setSaving(false);
        return;
      }

      toast.success("Profile updated");
      setSaving(false);
      window.location.reload();
    } catch {
      setSaving(false);
      toast.error("Network error");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported in this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHomeLat(pos.coords.latitude.toFixed(6));
        setHomeLng(pos.coords.longitude.toFixed(6));
        if (!homeLabel.trim()) setHomeLabel("My start location");
        toast.success("Location filled");
      },
      () => {
        toast.error("Could not get location. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="rounded-2xl border bg-card p-5 lg:col-span-5">
        <div className="flex items-center gap-3">
          {initial.image ? (
            <img
              src={initial.image}
              alt={initial.name || "User"}
              className="h-12 w-12 rounded-full border object-cover"
            />
          ) : (
            <div className="h-12 w-12 rounded-full border bg-muted" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold">{initial.name || "User"}</div>
            <div className="text-xs text-muted-foreground truncate">{initial.email}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border bg-muted/30 p-4 text-sm">
          <div className="font-semibold">Why set a start location?</div>
          <div className="mt-1 text-muted-foreground text-xs leading-relaxed">
            TrailPulse can show <b>nearby trails</b>, improve <b>weekly recommendations</b>, and give better planning context.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 lg:col-span-7">
        <h2 className="text-lg font-semibold">Start location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter coordinates or use your browser’s location button.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3 space-y-2">
            <div className="text-sm font-semibold">Label</div>
            <input
              value={homeLabel}
              onChange={(e) => setHomeLabel(e.target.value)}
              placeholder="e.g., Quezon City, PH"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Latitude</div>
            <input
              value={homeLat}
              onChange={(e) => setHomeLat(e.target.value)}
              placeholder="e.g., 14.6760"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold">Longitude</div>
            <input
              value={homeLng}
              onChange={(e) => setHomeLng(e.target.value)}
              placeholder="e.g., 121.0437"
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={useMyLocation} type="button" className="w-full">
              Use my location
            </Button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </section>
    </div>
  );
}